import { Request, Response } from 'express';
import { processChatMessage } from '../services/inventory-chat.service';
import { analyzeInventoryImage } from '../services/image-ai.service';
import { getMissingFields } from '../utils/ai-validation';
import Category from '../models/category.model';
import Supplier from '../models/supplier.model';
import Product from '../models/product.model';
import { normalizeRole } from '../middleware/role.middleware';

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const parseNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const buildSku = (name: string): string => {
  const prefix = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 12);

  return `${prefix || 'ITEM'}-${Date.now().toString().slice(-6)}`;
};

export const chatWithAI = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message } = req.body;

    if (!message) {
      res.status(400).json({
        success: false,
        message: 'message is required'
      });
      return;
    }

    const result = await processChatMessage(
      message,
      normalizeRole(req.user?.role)
    );

    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'AI chat failed'
    });
  }
};

export const analyzeImageWithAI = async (req: Request, res: Response) => {
  try {
    const entityType = req.body.entityType;

    // ✅ Check if file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Upload file is required'
      });
    }

    const result = await analyzeInventoryImage(req.file.path, entityType);
    const items = result.items && result.items.length > 0 ? result.items : [result.data];
    const missingFields = Array.from(
      new Set(items.flatMap((item) => getMissingFields(entityType, item)))
    );

    res.json({
      success: true,
      action: 'image_analysis',
      result,
      missingFields,
      requiresUserInput: missingFields.length > 0
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
export const completeEntityFromAI = async (req: Request, res: Response) => {
  try {
    const { entityType, data } = req.body;
    const items = Array.isArray(data) ? data : [data];

    const missingFields = Array.from(
      new Set(items.flatMap((item) => getMissingFields(entityType, item)))
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Still missing required fields',
        missingFields
      });
    }

    const createdItems = [];

    for (const item of items) {
      let saved;

      if (entityType === 'category') {
        const name = normalizeText(item?.name);
        const description = normalizeText(item?.description);

        const existingCategory = await Category.findOne({
          name: new RegExp(`^${escapeRegex(name)}$`, 'i')
        });

        if (existingCategory) {
          return res.status(400).json({
            success: false,
            message: `Category "${name}" already exists`
          });
        }

        saved = await Category.create({
          name,
          description
        });
      }

      if (entityType === 'supplier') {
        const name = normalizeText(item?.name);
        const phone = normalizeText(item?.phone);
        const email = normalizeText(item?.email).toLowerCase();
        const address = normalizeText(item?.address);

        const existingSupplier = await Supplier.findOne({
          name: new RegExp(`^${escapeRegex(name)}$`, 'i')
        });

        if (existingSupplier) {
          return res.status(400).json({
            success: false,
            message: `Supplier "${name}" already exists`
          });
        }

        saved = await Supplier.create({
          name,
          phone,
          email,
          address
        });
      }

      if (entityType === 'product') {
        const categoryName = normalizeText(item?.category);
        const category = await Category.findOne({
          name: new RegExp(`^${escapeRegex(categoryName)}$`, 'i')
        });

        if (!category) {
          return res.status(400).json({
            success: false,
            message: `Category "${categoryName}" not found`
          });
        }

        let supplierId = undefined;
        const supplierName = normalizeText(item?.supplier);

        if (supplierName) {
          const supplier = await Supplier.findOne({
            name: new RegExp(`^${escapeRegex(supplierName)}$`, 'i')
          });

          if (!supplier) {
            return res.status(400).json({
              success: false,
              message: `Supplier "${supplierName}" not found`
            });
          }

          supplierId = supplier._id;
        }

        const productName = normalizeText(item?.name);
        const sku = normalizeText(item?.sku) || buildSku(productName);
        const costPrice = parseNumber(item?.costPrice, 0);
        const sellingPrice = parseNumber(item?.sellingPrice, 0);
        const quantity = parseNumber(item?.quantity, 0);
        const reorderLevel = parseNumber(item?.reorderLevel, 5);

        const existingProduct = await Product.findOne({ sku });
        if (existingProduct) {
          return res.status(400).json({
            success: false,
            message: `Product SKU "${sku}" already exists`
          });
        }

        saved = await Product.create({
          name: productName,
          sku,
          description: normalizeText(item?.description),
          category: category._id,
          supplier: supplierId,
          costPrice,
          sellingPrice,
          quantity,
          reorderLevel,
          unit: normalizeText(item?.unit),
          barcode: normalizeText(item?.barcode),
          brand: normalizeText(item?.brand)
        });
      }

      if (!saved) {
        return res.status(400).json({
          success: false,
          message: 'Invalid entity type'
        });
      }

      createdItems.push(saved);
    }

    if (!createdItems.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entity type'
      });
    }

    res.json({
      success: true,
      message:
        createdItems.length > 1
          ? `${createdItems.length} ${entityType}s created successfully`
          : `${entityType} created successfully`,
      data: createdItems.length > 1 ? createdItems : createdItems[0]
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
export const getAllData = async (req: Request, res: Response) => {
  try {
    const { type } = req.query;

    if (type === 'products') {
      const products = await Product.find().populate('category');
      return res.json(products);
    }

    if (type === 'categories') {
      const categories = await Category.find();
      return res.json(categories);
    }

    if (type === 'suppliers') {
      const suppliers = await Supplier.find();
      return res.json(suppliers);
    }

    res.status(400).json({ message: 'Invalid type' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
