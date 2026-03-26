import aiClient from './ai.service';
import { parseJsonSafely } from '../utils/ai-json';
import Product from '../models/product.model';
import Category from '../models/category.model';
import Supplier from '../models/supplier.model';
import { getMissingFields } from '../utils/ai-validation';

type SupportedEntity = 'product' | 'category' | 'supplier';
type UserRole = 'admin' | 'manager' | 'supervisor' | 'user' | 'staff' | '';

type AIAction =
  | 'general_chat'
  | 'low_stock'
  | 'inventory_summary'
  | 'create_product'
  | 'create_category'
  | 'create_supplier'
  | 'update_product'
  | 'update_category'
  | 'update_supplier'
  | 'delete_product'
  | 'delete_category'
  | 'delete_supplier'
  | 'search_products'
  | 'get_products'
  | 'get_categories'
  | 'get_suppliers'
  | 'missing_fields';

export interface AIChatResponse {
  success: boolean;
  reply: string;
  action: AIAction;
  data: any;
  missingFields?: string[];
}

interface ParsedIntent {
  action: AIAction;
  entityType?: SupportedEntity;
  data: Record<string, any>;
}

const hasOpenRouterApiKey = (): boolean =>
  Boolean(
    process.env.OPENROUTER_API_KEY &&
      process.env.OPENROUTER_API_KEY !== 'missing-openrouter-api-key'
  );

const normalizeRole = (role: unknown): UserRole => {
  const value = typeof role === 'string' ? role.trim().toLowerCase() : '';

  if (value === 'superviser') {
    return 'supervisor';
  }

  if (value === 'staff') {
    return 'user';
  }

  return value as UserRole;
};

const canManageInventory = (role: unknown): boolean =>
  ['admin', 'manager'].includes(normalizeRole(role));

const isWriteAction = (action: AIAction): boolean =>
  action.startsWith('create_') ||
  action.startsWith('update_') ||
  action.startsWith('delete_');

const MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';

const numberFields = ['quantity', 'costPrice', 'sellingPrice', 'reorderLevel'];

const normalizeString = (value: string): string => value.trim().replace(/\s+/g, ' ');

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toTitleCase = (value: string): string =>
  normalizeString(value)
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const cleaned = value.replace(/[^0-9.-]/g, '');
  if (!cleaned) {
    return undefined;
  }

  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseFieldValue = (key: string, value: string): string | number => {
  if (numberFields.includes(key)) {
    return parseNumber(value) ?? value;
  }

  return normalizeString(value);
};

const extractQuotedValue = (message: string): string | undefined => {
  const match = message.match(/["']([^"']+)["']/);
  return match?.[1] ? normalizeString(match[1]) : undefined;
};

const extractAfterKeyword = (message: string, keyword: string): string | undefined => {
  const pattern = new RegExp(`${keyword}\\s+(.+)$`, 'i');
  const match = message.match(pattern);
  if (!match?.[1]) {
    return undefined;
  }

  return normalizeString(match[1].split(/\s+(?:with|where|set|price|cost|quantity|reorder)\b/i)[0]);
};

const parseInlineFields = (message: string): Record<string, any> => {
  const fields: Record<string, any> = {};

  const fieldPatterns: Array<{ key: string; patterns: RegExp[] }> = [
    { key: 'name', patterns: [/\bname\s*(?:is|=|:)\s*["']?([^,"'\n]+)["']?/i] },
    { key: 'sku', patterns: [/\bsku\s*(?:is|=|:)\s*["']?([^,"'\n]+)["']?/i] },
    { key: 'category', patterns: [/\bcategory\s*(?:is|=|:)\s*["']?([^,"'\n]+)["']?/i] },
    { key: 'supplier', patterns: [/\bsupplier\s*(?:is|=|:)\s*["']?([^,"'\n]+)["']?/i] },
    { key: 'brand', patterns: [/\bbrand\s*(?:is|=|:)\s*["']?([^,"'\n]+)["']?/i] },
    { key: 'unit', patterns: [/\bunit\s*(?:is|=|:)\s*["']?([^,"'\n]+)["']?/i] },
    { key: 'barcode', patterns: [/\bbarcode\s*(?:is|=|:)\s*["']?([^,"'\n]+)["']?/i] },
    { key: 'description', patterns: [/\bdescription\s*(?:is|=|:)\s*["']?([^"']+)["']?/i] },
    { key: 'email', patterns: [/\bemail\s*(?:is|=|:)\s*["']?([^,"'\n]+)["']?/i] },
    { key: 'phone', patterns: [/\bphone\s*(?:is|=|:)\s*["']?([^,"'\n]+)["']?/i] },
    { key: 'address', patterns: [/\baddress\s*(?:is|=|:)\s*["']?([^"']+)["']?/i] },
    { key: 'costPrice', patterns: [/\bcost(?:\s+price)?\s*(?:is|=|:|to)\s*([$0-9.,-]+)/i] },
    { key: 'sellingPrice', patterns: [/\b(?:selling|sale)\s+price\s*(?:is|=|:|to)\s*([$0-9.,-]+)/i] },
    { key: 'quantity', patterns: [/\bquantity\s*(?:is|=|:|to)\s*([0-9.-]+)/i] },
    { key: 'reorderLevel', patterns: [/\breorder(?:\s+level)?\s*(?:is|=|:|to)\s*([0-9.-]+)/i] }
  ];

  for (const field of fieldPatterns) {
    for (const pattern of field.patterns) {
      const match = message.match(pattern);
      if (match?.[1]) {
        fields[field.key] = parseFieldValue(field.key, match[1]);
        break;
      }
    }
  }

  const shorthandQuantity = message.match(/\b(?:qty|quantity)\s+([0-9.-]+)/i);
  if (shorthandQuantity?.[1] && fields.quantity === undefined) {
    fields.quantity = parseNumber(shorthandQuantity[1]);
  }

  const shorthandCost = message.match(/\bcost\s+([$0-9.,-]+)/i);
  if (shorthandCost?.[1] && fields.costPrice === undefined) {
    fields.costPrice = parseNumber(shorthandCost[1]);
  }

  const shorthandSelling = message.match(/\b(?:sell|selling|price)\s+([$0-9.,-]+)/i);
  if (shorthandSelling?.[1] && fields.sellingPrice === undefined) {
    fields.sellingPrice = parseNumber(shorthandSelling[1]);
  }

  return fields;
};

const guessEntityType = (message: string): SupportedEntity | undefined => {
  const lower = message.toLowerCase();

  if (/\b(category|categories)\b/.test(lower)) {
    return 'category';
  }

  if (/\b(supplier|suppliers|vendor|vendors)\b/.test(lower)) {
    return 'supplier';
  }

  if (/\b(product|products|item|items)\b/.test(lower)) {
    return 'product';
  }

  return undefined;
};

const buildLocalIntent = (message: string): ParsedIntent => {
  const lower = message.toLowerCase();
  const entityType = guessEntityType(message);
  const data = parseInlineFields(message);

  const quoted = extractQuotedValue(message);
  const mentionedName =
    quoted ||
    extractAfterKeyword(message, '(?:named|called|for)') ||
    extractAfterKeyword(message, '(?:product|category|supplier|item)');

  if (mentionedName && !data.name) {
    data.name = mentionedName;
  }

  if (/\blow stock\b/.test(lower)) {
    return { action: 'low_stock', entityType: 'product', data };
  }

  if (/\b(summary|overview|status)\b/.test(lower) && /\binventory\b/.test(lower)) {
    return { action: 'inventory_summary', data };
  }

  if (/\b(list|show|get|display|view)\b/.test(lower)) {
    if (entityType === 'category') {
      return { action: 'get_categories', entityType, data };
    }

    if (entityType === 'supplier') {
      return { action: 'get_suppliers', entityType, data };
    }

    return { action: 'get_products', entityType: 'product', data };
  }

  if (/\b(search|find|lookup)\b/.test(lower) && (entityType === 'product' || !entityType)) {
    return { action: 'search_products', entityType: 'product', data };
  }

  if (/\bdelete|remove\b/.test(lower)) {
    if (entityType === 'category') {
      return { action: 'delete_category', entityType, data };
    }

    if (entityType === 'supplier') {
      return { action: 'delete_supplier', entityType, data };
    }

    return { action: 'delete_product', entityType: 'product', data };
  }

  if (/\bupdate|edit|change\b/.test(lower)) {
    if (entityType === 'category') {
      return { action: 'update_category', entityType, data };
    }

    if (entityType === 'supplier') {
      return { action: 'update_supplier', entityType, data };
    }

    return { action: 'update_product', entityType: 'product', data };
  }

  if (/\bcreate|add|new\b/.test(lower)) {
    if (entityType === 'category') {
      return { action: 'create_category', entityType, data };
    }

    if (entityType === 'supplier') {
      return { action: 'create_supplier', entityType, data };
    }

    return { action: 'create_product', entityType: 'product', data };
  }

  return {
    action: 'general_chat',
    entityType,
    data
  };
};

const requestMissingFields = (
  entityType: SupportedEntity,
  action: AIAction,
  data: Record<string, any>,
  missingFields: string[]
): AIChatResponse => ({
  success: false,
  action: 'missing_fields',
  reply: `Please provide: ${missingFields.join(', ')}`,
  data: {
    action,
    entityType,
    ...data
  },
  missingFields
});

const findCategory = async (value?: string) => {
  if (!value) {
    return null;
  }

  return Category.findOne({
    name: new RegExp(`^${escapeRegex(value)}$`, 'i')
  });
};

const findSupplier = async (value?: string) => {
  if (!value) {
    return null;
  }

  return Supplier.findOne({
    name: new RegExp(`^${escapeRegex(value)}$`, 'i')
  });
};

const findProduct = async (data: Record<string, any>) => {
  if (data.sku) {
    return Product.findOne({ sku: data.sku });
  }

  if (data.name) {
    return Product.findOne({
      name: new RegExp(`^${escapeRegex(data.name)}$`, 'i')
    });
  }

  return null;
};

const formatProduct = (product: any) => ({
  _id: String(product._id),
  name: product.name,
  sku: product.sku,
  description: product.description || '',
  category:
    typeof product.category === 'object' && product.category
      ? product.category.name
      : product.category,
  supplier:
    typeof product.supplier === 'object' && product.supplier
      ? product.supplier.name
      : product.supplier || '',
  quantity: product.quantity ?? 0,
  costPrice: product.costPrice ?? 0,
  sellingPrice: product.sellingPrice ?? 0,
  reorderLevel: product.reorderLevel ?? 0,
  unit: product.unit || '',
  barcode: product.barcode || '',
  brand: product.brand || ''
});

const formatCategory = (category: any) => ({
  _id: String(category._id),
  name: category.name,
  description: category.description || ''
});

const formatSupplier = (supplier: any) => ({
  _id: String(supplier._id),
  name: supplier.name,
  phone: supplier.phone || '',
  email: supplier.email || '',
  address: supplier.address || ''
});

const buildInventorySummary = async (): Promise<AIChatResponse> => {
  const [totalProducts, totalCategories, totalSuppliers, lowStockCount, outOfStockCount] =
    await Promise.all([
      Product.countDocuments({ isActive: true }),
      Category.countDocuments({ isActive: true }),
      Supplier.countDocuments({ isActive: true }),
      Product.countDocuments({
        $expr: { $lte: ['$quantity', '$reorderLevel'] },
        isActive: true
      }),
      Product.countDocuments({ quantity: 0, isActive: true })
    ]);

  return {
    success: true,
    action: 'inventory_summary',
    reply: 'Here is your current inventory summary.',
    data: {
      totalProducts,
      totalCategories,
      totalSuppliers,
      lowStockCount,
      outOfStockCount
    }
  };
};

const executeIntent = async (intent: ParsedIntent): Promise<AIChatResponse> => {
  switch (intent.action) {
    case 'create_product': {
      const productData: Record<string, any> = {
        ...intent.data,
        name: intent.data.name ? toTitleCase(intent.data.name) : intent.data.name
      };
      const missingFields = getMissingFields('product', productData);
      if (missingFields.length > 0) {
        return requestMissingFields('product', 'create_product', productData, missingFields);
      }

      const category = await findCategory(productData.category);
      if (!category) {
        return {
          success: false,
          action: 'create_product',
          reply: `Category "${productData.category}" not found.`,
          data: {}
        };
      }

      const supplier = await findSupplier(productData.supplier);
      const product = await Product.create({
        name: productData.name,
        sku: productData.sku || `SKU-${Date.now()}`,
        description: productData.description || '',
        category: category._id,
        supplier: supplier?._id,
        costPrice: parseNumber(productData.costPrice) ?? 0,
        sellingPrice: parseNumber(productData.sellingPrice) ?? 0,
        quantity: parseNumber(productData.quantity) ?? 0,
        reorderLevel: parseNumber(productData.reorderLevel) ?? 5,
        unit: productData.unit || '',
        barcode: productData.barcode || '',
        brand: productData.brand || ''
      });

      const saved = await Product.findById(product._id).populate('category', 'name').populate('supplier', 'name');
      return {
        success: true,
        action: 'create_product',
        reply: 'Product created successfully.',
        data: saved ? formatProduct(saved) : formatProduct(product)
      };
    }

    case 'create_category': {
      const categoryData: Record<string, any> = {
        ...intent.data,
        name: intent.data.name ? toTitleCase(intent.data.name) : intent.data.name
      };
      const missingFields = getMissingFields('category', categoryData);
      if (missingFields.length > 0) {
        return requestMissingFields('category', 'create_category', categoryData, missingFields);
      }

      const existing = await findCategory(categoryData.name);
      if (existing) {
        return {
          success: false,
          action: 'create_category',
          reply: `Category "${categoryData.name}" already exists.`,
          data: formatCategory(existing)
        };
      }

      const category = await Category.create({
        name: categoryData.name,
        description: categoryData.description || ''
      });

      return {
        success: true,
        action: 'create_category',
        reply: 'Category created successfully.',
        data: formatCategory(category)
      };
    }

    case 'create_supplier': {
      const supplierData: Record<string, any> = {
        ...intent.data,
        name: intent.data.name ? toTitleCase(intent.data.name) : intent.data.name
      };
      const missingFields = getMissingFields('supplier', supplierData);
      if (missingFields.length > 0) {
        return requestMissingFields('supplier', 'create_supplier', supplierData, missingFields);
      }

      const supplier = await Supplier.create({
        name: supplierData.name,
        phone: supplierData.phone || '',
        email: supplierData.email || '',
        address: supplierData.address || ''
      });

      return {
        success: true,
        action: 'create_supplier',
        reply: 'Supplier created successfully.',
        data: formatSupplier(supplier)
      };
    }

    case 'get_products': {
      const products = await Product.find()
        .populate('category', 'name')
        .populate('supplier', 'name')
        .sort({ createdAt: -1 })
        .lean();

      return {
        success: true,
        action: 'get_products',
        reply: `Found ${products.length} products.`,
        data: {
          products: products.map(formatProduct)
        }
      };
    }

    case 'get_categories': {
      const categories = await Category.find().sort({ createdAt: -1 }).lean();
      return {
        success: true,
        action: 'get_categories',
        reply: `Found ${categories.length} categories.`,
        data: {
          categories: categories.map(formatCategory)
        }
      };
    }

    case 'get_suppliers': {
      const suppliers = await Supplier.find().sort({ createdAt: -1 }).lean();
      return {
        success: true,
        action: 'get_suppliers',
        reply: `Found ${suppliers.length} suppliers.`,
        data: {
          suppliers: suppliers.map(formatSupplier)
        }
      };
    }

    case 'search_products': {
      const search = intent.data.name || intent.data.category || intent.data.brand || '';
      const filters = search
        ? {
            $or: [
              { name: new RegExp(escapeRegex(search), 'i') },
              { brand: new RegExp(escapeRegex(search), 'i') },
              { sku: new RegExp(escapeRegex(search), 'i') }
            ]
          }
        : {};

      const products = await Product.find(filters)
        .populate('category', 'name')
        .populate('supplier', 'name')
        .sort({ createdAt: -1 })
        .lean();

      return {
        success: true,
        action: 'search_products',
        reply: products.length ? `Found ${products.length} matching products.` : 'No matching products found.',
        data: {
          products: products.map(formatProduct)
        }
      };
    }

    case 'update_product': {
      const product = await findProduct(intent.data);
      if (!product) {
        return requestMissingFields('product', 'update_product', intent.data, ['name or sku']);
      }

      const updateData: Record<string, any> = {};
      for (const key of ['name', 'description', 'sku', 'quantity', 'costPrice', 'sellingPrice', 'reorderLevel', 'unit', 'barcode', 'brand']) {
        if (intent.data[key] !== undefined) {
          updateData[key] = numberFields.includes(key)
            ? parseNumber(intent.data[key]) ?? intent.data[key]
            : intent.data[key];
        }
      }

      if (intent.data.category) {
        const category = await findCategory(intent.data.category);
        if (!category) {
          return {
            success: false,
            action: 'update_product',
            reply: `Category "${intent.data.category}" not found.`,
            data: {}
          };
        }

        updateData.category = category._id;
      }

      if (intent.data.supplier) {
        const supplier = await findSupplier(intent.data.supplier);
        if (!supplier) {
          return {
            success: false,
            action: 'update_product',
            reply: `Supplier "${intent.data.supplier}" not found.`,
            data: {}
          };
        }

        updateData.supplier = supplier._id;
      }

      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          action: 'update_product',
          reply: 'Please tell me what fields to update for the product.',
          data: {
            action: 'update_product',
            entityType: 'product',
            name: intent.data.name,
            sku: intent.data.sku
          }
        };
      }

      Object.assign(product, updateData);
      await product.save();

      const updated = await Product.findById(product._id).populate('category', 'name').populate('supplier', 'name');
      return {
        success: true,
        action: 'update_product',
        reply: 'Product updated successfully.',
        data: updated ? formatProduct(updated) : formatProduct(product)
      };
    }

    case 'update_category': {
      if (!intent.data.name) {
        return requestMissingFields('category', 'update_category', intent.data, ['name']);
      }

      const category = await findCategory(intent.data.name);
      if (!category) {
        return {
          success: false,
          action: 'update_category',
          reply: `Category "${intent.data.name}" not found.`,
          data: {}
        };
      }

      const updateData: Record<string, any> = {};
      if (intent.data.description !== undefined) {
        updateData.description = intent.data.description;
      }
      if (intent.data.newName !== undefined) {
        updateData.name = toTitleCase(intent.data.newName);
      }

      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          action: 'update_category',
          reply: 'Please provide the category fields to update.',
          data: {
            action: 'update_category',
            entityType: 'category',
            name: intent.data.name
          }
        };
      }

      Object.assign(category, updateData);
      await category.save();

      return {
        success: true,
        action: 'update_category',
        reply: 'Category updated successfully.',
        data: formatCategory(category)
      };
    }

    case 'update_supplier': {
      if (!intent.data.name) {
        return requestMissingFields('supplier', 'update_supplier', intent.data, ['name']);
      }

      const supplier = await findSupplier(intent.data.name);
      if (!supplier) {
        return {
          success: false,
          action: 'update_supplier',
          reply: `Supplier "${intent.data.name}" not found.`,
          data: {}
        };
      }

      const updateData: Record<string, any> = {};
      for (const key of ['email', 'phone', 'address']) {
        if (intent.data[key] !== undefined) {
          updateData[key] = intent.data[key];
        }
      }

      if (intent.data.newName !== undefined) {
        updateData.name = toTitleCase(intent.data.newName);
      }

      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          action: 'update_supplier',
          reply: 'Please provide the supplier fields to update.',
          data: {
            action: 'update_supplier',
            entityType: 'supplier',
            name: intent.data.name
          }
        };
      }

      Object.assign(supplier, updateData);
      await supplier.save();

      return {
        success: true,
        action: 'update_supplier',
        reply: 'Supplier updated successfully.',
        data: formatSupplier(supplier)
      };
    }

    case 'delete_product': {
      const product = await findProduct(intent.data);
      if (!product) {
        return requestMissingFields('product', 'delete_product', intent.data, ['name or sku']);
      }

      await Product.findByIdAndDelete(product._id);
      return {
        success: true,
        action: 'delete_product',
        reply: `Product "${product.name}" deleted successfully.`,
        data: {
          _id: String(product._id),
          name: product.name
        }
      };
    }

    case 'delete_category': {
      if (!intent.data.name) {
        return requestMissingFields('category', 'delete_category', intent.data, ['name']);
      }

      const category = await findCategory(intent.data.name);
      if (!category) {
        return {
          success: false,
          action: 'delete_category',
          reply: `Category "${intent.data.name}" not found.`,
          data: {}
        };
      }

      await Category.findByIdAndDelete(category._id);
      return {
        success: true,
        action: 'delete_category',
        reply: `Category "${category.name}" deleted successfully.`,
        data: {
          _id: String(category._id),
          name: category.name
        }
      };
    }

    case 'delete_supplier': {
      if (!intent.data.name) {
        return requestMissingFields('supplier', 'delete_supplier', intent.data, ['name']);
      }

      const supplier = await findSupplier(intent.data.name);
      if (!supplier) {
        return {
          success: false,
          action: 'delete_supplier',
          reply: `Supplier "${intent.data.name}" not found.`,
          data: {}
        };
      }

      await Supplier.findByIdAndDelete(supplier._id);
      return {
        success: true,
        action: 'delete_supplier',
        reply: `Supplier "${supplier.name}" deleted successfully.`,
        data: {
          _id: String(supplier._id),
          name: supplier.name
        }
      };
    }

    case 'low_stock': {
      const products = await Product.find({
        $expr: { $lte: ['$quantity', '$reorderLevel'] },
        isActive: true
      })
        .populate('category', 'name')
        .populate('supplier', 'name')
        .sort({ quantity: 1 })
        .lean();

      return {
        success: true,
        action: 'low_stock',
        reply: products.length
          ? `Found ${products.length} low stock products.`
          : 'No low stock products found.',
        data: {
          products: products.map(formatProduct)
        }
      };
    }

    case 'inventory_summary':
      return buildInventorySummary();

    default:
      return {
        success: true,
        action: 'general_chat',
        reply:
          'I can help you create, update, delete, and list products, categories, and suppliers. Try commands like "list all products" or "delete product sku ABC-1".',
        data: {}
      };
  }
};

const buildSystemPrompt = (): string => `
You are an inventory AI assistant.

Return ONLY valid JSON.
Do not use markdown.
Do not add text outside JSON.

Allowed actions:
- general_chat
- low_stock
- inventory_summary
- create_product
- create_category
- create_supplier
- update_product
- update_category
- update_supplier
- delete_product
- delete_category
- delete_supplier
- search_products
- get_products
- get_categories
- get_suppliers

For missing input, still return the best action and include partial data.

JSON format:
{
  "success": true,
  "reply": "string",
  "action": "general_chat",
  "data": {}
}
`.trim();

const parseAiIntent = async (message: string): Promise<ParsedIntent | null> => {
  if (!hasOpenRouterApiKey()) {
    return null;
  }

  try {
    const completion = await aiClient.chat.completions.create(
      {
        model: MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: message }
        ],
        temperature: 0.1
      },
      {
        headers: {
          'HTTP-Referer': process.env.SITE_URL || 'http://localhost:4200',
          'X-OpenRouter-Title': process.env.SITE_NAME || 'Inventory AI App'
        }
      }
    );

    const raw = completion?.choices?.[0]?.message?.content ?? '';
    const parsed = parseJsonSafely<ParsedIntent>(
      typeof raw === 'string' ? raw : JSON.stringify(raw),
      {
        action: 'general_chat',
        data: {}
      }
    );

    if (!parsed?.action) {
      return null;
    }

    return {
      action: parsed.action,
      entityType: parsed.entityType,
      data: parsed.data || {}
    };
  } catch {
    return null;
  }
};

export const processChatMessage = async (
  message: string,
  role: unknown = ''
): Promise<AIChatResponse> => {
  try {
    const aiIntent = await parseAiIntent(message);
    const fallbackIntent = buildLocalIntent(message);
    const intent =
      aiIntent && aiIntent.action !== 'general_chat'
        ? {
            ...fallbackIntent,
            ...aiIntent,
            data: {
              ...fallbackIntent.data,
              ...aiIntent.data
            }
          }
        : fallbackIntent;

    if (isWriteAction(intent.action) && !canManageInventory(role)) {
      return {
        success: false,
        reply:
          'You have view-only access. Only Admin and Manager can create, update, or delete data.',
        action: 'general_chat',
        data: {
          requestedAction: intent.action,
          role: normalizeRole(role)
        }
      };
    }

    return await executeIntent(intent);
  } catch (error: any) {
    return {
      success: false,
      reply: error.message || 'AI processing failed',
      action: 'general_chat',
      data: {}
    };
  }
};
