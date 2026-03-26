import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import XLSX from 'xlsx';
import aiClient from './ai.service';
import { parseJsonSafely } from '../utils/ai-json';

export type EntityType = 'product' | 'category' | 'supplier';

export interface ProductExtracted {
  name: string;
  brand: string;
  barcode: string;
  category: string;
  supplier: string;
  description: string;
  unit: string;
  sku: string;
  quantity: string | number;
  costPrice: string | number;
  sellingPrice: string | number;
  reorderLevel: string | number;
}

export interface CategoryExtracted {
  name: string;
  description: string;
}

export interface SupplierExtracted {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface ImageAnalysisResult {
  entityType: EntityType;
  confidenceNote: string;
  data: ProductExtracted | CategoryExtracted | SupplierExtracted;
  items?: Array<ProductExtracted | CategoryExtracted | SupplierExtracted>;
  detectedText?: string;
}

const MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';
const VISION_MODEL =
  process.env.OPENROUTER_VISION_MODEL || process.env.OPENROUTER_MODEL || 'openrouter/free';

const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const excelExtensions = new Set(['.xlsx', '.xls', '.csv']);
const hasOpenRouterApiKey = (): boolean =>
  Boolean(
    process.env.OPENROUTER_API_KEY &&
      process.env.OPENROUTER_API_KEY !== 'missing-openrouter-api-key'
  );

const supportsVisionModel = (): boolean =>
  Boolean(VISION_MODEL) && VISION_MODEL.toLowerCase() !== 'openrouter/free';

const createFallbackResult = (entityType: EntityType): ImageAnalysisResult => {
  if (entityType === 'product') {
    return {
      entityType,
      confidenceNote: 'Could not confidently analyze uploaded file.',
      data: {
        name: '',
        brand: '',
        barcode: '',
        category: '',
        supplier: '',
        description: '',
        unit: '',
        sku: '',
        quantity: '',
        costPrice: '',
        sellingPrice: '',
        reorderLevel: ''
      }
    };
  }

  if (entityType === 'category') {
    return {
      entityType,
      confidenceNote: 'Could not confidently analyze uploaded file.',
      data: {
        name: '',
        description: ''
      }
    };
  }

  return {
    entityType,
    confidenceNote: 'Could not confidently analyze uploaded file.',
    data: {
      name: '',
      phone: '',
      email: '',
      address: ''
    }
  };
};

const normalizeHeader = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '');

const firstNonEmpty = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number' && !Number.isNaN(value)) {
      return String(value);
    }
  }

  return '';
};

const normalizeKey = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '');

const mergeData = <T extends object>(
  primary: T,
  secondary: Partial<T>
): T =>
  Object.fromEntries(
    Object.keys(primary as Record<string, unknown>).map((key) => [
      key,
      firstNonEmpty(
        (primary as Record<string, unknown>)[key],
        (secondary as Record<string, unknown>)[key]
      ) ||
        (primary as Record<string, unknown>)[key] ||
        (secondary as Record<string, unknown>)[key] ||
        ''
    ])
  ) as T;

const parseLabeledImageText = (
  rawText: string,
  entityType: EntityType,
  fallback: ImageAnalysisResult
): ProductExtracted | CategoryExtracted | SupplierExtracted => {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const entries = new Map<string, string>();

  for (const line of lines) {
    const match = line.match(/^([^:]+?)\s*[:\-]\s*(.+)$/);

    if (!match) {
      continue;
    }

    const key = normalizeKey(match[1]);
    const value = match[2].trim();

    if (!value) {
      continue;
    }

    entries.set(key, value);
  }

  if (entityType === 'category') {
    return mergeData(fallback.data as CategoryExtracted, {
      name: firstNonEmpty(
        entries.get('name'),
        entries.get('category'),
        entries.get('categoryname')
      ),
      description: firstNonEmpty(
        entries.get('description'),
        entries.get('details'),
        entries.get('desc')
      )
    }) as CategoryExtracted;
  }

  if (entityType === 'supplier') {
    return mergeData(fallback.data as SupplierExtracted, {
      name: firstNonEmpty(
        entries.get('name'),
        entries.get('supplier'),
        entries.get('suppliername'),
        entries.get('companyname')
      ),
      phone: firstNonEmpty(
        entries.get('phone'),
        entries.get('phonenumber'),
        entries.get('mobile'),
        entries.get('contactnumber')
      ),
      email: firstNonEmpty(entries.get('email'), entries.get('emailaddress')),
      address: firstNonEmpty(entries.get('address'), entries.get('location'))
    }) as SupplierExtracted;
  }

  const unitPrice = firstNonEmpty(
    entries.get('unitprice'),
    entries.get('price'),
    entries.get('costprice'),
    entries.get('sellingprice'),
    entries.get('purchaseprice'),
    entries.get('saleprice')
  );

  return mergeData(fallback.data as ProductExtracted, {
    name: firstNonEmpty(
      entries.get('name'),
      entries.get('productname'),
      entries.get('product'),
      entries.get('itemname')
    ),
    brand: firstNonEmpty(entries.get('brand')),
    barcode: firstNonEmpty(entries.get('barcode')),
    category: firstNonEmpty(entries.get('category'), entries.get('categoryname')),
    supplier: firstNonEmpty(
      entries.get('supplier'),
      entries.get('suppliername'),
      entries.get('vendor')
    ),
    description: firstNonEmpty(
      entries.get('description'),
      entries.get('details'),
      entries.get('desc')
    ),
    unit: firstNonEmpty(entries.get('unit'), entries.get('uom')),
    sku: firstNonEmpty(entries.get('sku'), entries.get('productcode'), entries.get('itemcode')),
    quantity: firstNonEmpty(entries.get('quantity'), entries.get('qty'), entries.get('stock')),
    costPrice: unitPrice,
    sellingPrice: firstNonEmpty(entries.get('sellingprice'), entries.get('saleprice'), unitPrice),
    reorderLevel: firstNonEmpty(
      entries.get('reorderlevel'),
      entries.get('minstock'),
      entries.get('minimumstock')
    )
  }) as ProductExtracted;
};

const countFilledFields = (value: object): number =>
  Object.values(value as Record<string, unknown>).filter(
    (entry) => firstNonEmpty(entry) !== ''
  ).length;

const mapRowValues = (row: Record<string, unknown>) => {
  const normalizedEntries = Object.entries(row).map(([key, value]) => [
    normalizeHeader(key),
    value
  ] as const);

  return (...keys: string[]): string =>
    firstNonEmpty(
      ...keys.map(
        (key) => normalizedEntries.find(([entryKey]) => entryKey === key)?.[1]
      )
    );
};

const extractItemsFromRows = (
  rows: Record<string, unknown>[],
  entityType: EntityType
):
  | Array<ProductExtracted | CategoryExtracted | SupplierExtracted>
  | null => {
  if (!rows.length) {
    return null;
  }

  if (entityType === 'category') {
    const items = rows
      .map((row) => {
        const getValue = mapRowValues(row);
        return {
          name: getValue('name', 'categoryname', 'category'),
          description: getValue('description', 'details', 'desc')
        };
      })
      .filter((item) => item.name || item.description);

    return items.length > 0 ? items : null;
  }

  if (entityType === 'supplier') {
    const items = rows
      .map((row) => {
        const getValue = mapRowValues(row);
        return {
          name: getValue('name', 'suppliername', 'supplier', 'companyname'),
          phone: getValue('phone', 'phonenumber', 'mobile', 'contactnumber'),
          email: getValue('email', 'emailaddress'),
          address: getValue('address', 'location')
        };
      })
      .filter((item) => item.name || item.email || item.phone || item.address);

    return items.length > 0 ? items : null;
  }

  const items = rows
    .map((row) => {
      const getValue = mapRowValues(row);
      return {
        name: getValue('name', 'productname', 'itemname', 'product'),
        brand: getValue('brand'),
        barcode: getValue('barcode'),
        category: getValue('category', 'categoryname'),
        supplier: getValue('supplier', 'suppliername', 'vendor'),
        description: getValue('description', 'details', 'desc'),
        unit: getValue('unit', 'uom'),
        sku: getValue('sku', 'productcode', 'itemcode'),
        quantity: getValue('quantity', 'qty', 'stock'),
        costPrice: getValue('costprice', 'cost', 'unitprice', 'purchaseprice'),
        sellingPrice: getValue('sellingprice', 'saleprice', 'price'),
        reorderLevel: getValue('reorderlevel', 'minstock', 'minimumstock')
      } as ProductExtracted;
    })
    .filter((item) =>
      Object.values(item).some((value) => String(value).trim() !== '')
    );

  return items.length > 0 ? items : null;
};

const buildExpectedShape = (entityType: EntityType): string => {
  if (entityType === 'product') {
    return `{
  "name": "",
  "brand": "",
  "barcode": "",
  "category": "",
  "supplier": "",
  "description": "",
  "unit": "",
  "sku": "",
  "quantity": "",
  "costPrice": "",
  "sellingPrice": "",
  "reorderLevel": ""
}`;
  }

  if (entityType === 'category') {
    return `{
  "name": "",
  "description": ""
}`;
  }

  return `{
  "name": "",
  "phone": "",
  "email": "",
  "address": ""
}`;
};

const getMimeTypeFromFilePath = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';

  return 'image/jpeg';
};

const analyzeWithVision = async (
  filePath: string,
  entityType: EntityType,
  fallback: ImageAnalysisResult
): Promise<ImageAnalysisResult> => {
  if (!hasOpenRouterApiKey()) {
    return {
      ...fallback,
      confidenceNote:
        'AI image analysis is unavailable because OPENROUTER_API_KEY is not configured.'
    };
  }

  if (!supportsVisionModel()) {
    return {
      ...fallback,
      confidenceNote:
        'Handwritten and image analysis need a vision-capable model. Set OPENROUTER_VISION_MODEL in the backend .env and restart the backend.'
    };
  }

  const fileBuffer = fs.readFileSync(filePath);
  const mimeType = getMimeTypeFromFilePath(filePath);
  const base64Image = fileBuffer.toString('base64');

  const prompt = `
You are analyzing an inventory-related uploaded file.

Return ONLY raw JSON.
Do NOT wrap the response in markdown.
Do NOT add explanation before or after JSON.
Do not invent exact values.
If a field is not visible, return empty string.
This may be a handwritten note, handwritten bill, receipt, paper form, or casual notebook entry.
Read handwritten text carefully and preserve the exact visible wording when possible.

Entity type: ${entityType}

Expected JSON shape:
{
  "entityType": "${entityType}",
  "confidenceNote": "short note",
  "detectedText": "plain text transcription of visible handwritten or printed content",
  "data": ${buildExpectedShape(entityType)}
}
  `.trim();

  const completion = await aiClient.chat.completions.create(
    {
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      temperature: 0.2
    },
    {
      headers: {
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:4200',
        'X-OpenRouter-Title': process.env.SITE_NAME || 'Inventory AI App'
      }
    }
  );

  const rawContent = completion?.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error('Empty AI response content received from OpenRouter');
  }

  const parsed = parseJsonSafely<ImageAnalysisResult & { detectedText?: string }>(
    typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent),
    fallback
  );

  const parsedData = parsed?.data || fallback.data;
  const labeledTextData = parsed?.detectedText
    ? parseLabeledImageText(parsed.detectedText, entityType, fallback)
    : fallback.data;
  const mergedData =
    countFilledFields(parsedData) >= countFilledFields(labeledTextData)
      ? mergeData(parsedData, labeledTextData)
      : mergeData(labeledTextData, parsedData);

  return {
    entityType,
    confidenceNote:
      parsed?.confidenceNote ||
      (parsed?.detectedText
        ? 'Extracted details from uploaded handwritten or printed image.'
        : fallback.confidenceNote),
    detectedText: parsed?.detectedText || '',
    data: mergedData as unknown as
      | ProductExtracted
      | CategoryExtracted
      | SupplierExtracted
  };
};

const extractPdfText = async (filePath: string): Promise<string> => {
  const fileBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: new Uint8Array(fileBuffer) });
  const parsed = await parser.getText();
  await parser.destroy();
  return parsed.text || '';
};

const extractSpreadsheetText = (filePath: string): string => {
  const workbook = XLSX.readFile(filePath, { raw: false });

  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return `Sheet: ${sheetName}\n${csv}`;
  }).join('\n\n');
};

const extractSpreadsheetStructuredData = (
  filePath: string,
  entityType: EntityType,
  fallback: ImageAnalysisResult
): ImageAnalysisResult | null => {
  const workbook = XLSX.readFile(filePath, { raw: false });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: ''
    });

    if (!rows.length) {
      continue;
    }
    const items = extractItemsFromRows(rows, entityType);

    if (items && items.length > 0) {
      const label = entityType === 'category' ? 'category' : entityType;
      return {
        entityType,
        confidenceNote:
          items.length > 1
            ? `Extracted ${items.length} ${label} records from sheet "${sheetName}".`
            : `Extracted ${label} data from sheet "${sheetName}".`,
        data: items[0],
        items
      };
    }
  }

  return null;
};

const splitStructuredLine = (line: string): string[] =>
  line
    .split(/\t+|\s{2,}|\s\|\s/)
    .map((part) => part.trim())
    .filter(Boolean);

const extractPdfStructuredData = async (
  filePath: string,
  entityType: EntityType
): Promise<ImageAnalysisResult | null> => {
  const extractedText = await extractPdfText(filePath);
  const lines = extractedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return null;
  }

  for (let index = 0; index < lines.length - 1; index += 1) {
    const headerParts = splitStructuredLine(lines[index]);

    if (headerParts.length < 2) {
      continue;
    }

    const normalizedHeaders = headerParts.map((part) => normalizeHeader(part));
    const recognizedHeaderCount = normalizedHeaders.filter((header) =>
      [
        'name',
        'category',
        'categoryname',
        'description',
        'details',
        'desc',
        'email',
        'emailaddress',
        'phone',
        'phonenumber',
        'mobile',
        'contactnumber',
        'address',
        'location',
        'supplier',
        'suppliername',
        'companyname',
        'brand',
        'barcode',
        'unit',
        'uom',
        'sku',
        'productcode',
        'itemcode',
        'quantity',
        'qty',
        'stock',
        'costprice',
        'cost',
        'unitprice',
        'purchaseprice',
        'sellingprice',
        'saleprice',
        'price',
        'reorderlevel',
        'minstock',
        'minimumstock'
      ].includes(header)
    ).length;

    if (recognizedHeaderCount < 2) {
      continue;
    }

    const rows: Record<string, unknown>[] = [];

    for (let rowIndex = index + 1; rowIndex < lines.length; rowIndex += 1) {
      const values = splitStructuredLine(lines[rowIndex]);

      if (values.length !== headerParts.length) {
        continue;
      }

      rows.push(
        Object.fromEntries(
          headerParts.map((header, columnIndex) => [header, values[columnIndex] || ''])
        )
      );
    }

    const items = extractItemsFromRows(rows, entityType);

    if (items && items.length > 0) {
      const label = entityType === 'category' ? 'category' : entityType;
      return {
        entityType,
        confidenceNote:
          items.length > 1
            ? `Extracted ${items.length} ${label} records from the uploaded PDF.`
            : `Extracted ${label} data from the uploaded PDF.`,
        data: items[0],
        items
      };
    }
  }

  return null;
};

const analyzeTextDocument = async (
  filePath: string,
  entityType: EntityType,
  fallback: ImageAnalysisResult
): Promise<ImageAnalysisResult> => {
  const ext = path.extname(filePath).toLowerCase();
  let extractedText = '';

  if (ext === '.pdf') {
    const structuredPdfData = await extractPdfStructuredData(filePath, entityType);

    if (structuredPdfData) {
      return structuredPdfData;
    }

    extractedText = await extractPdfText(filePath);
  } else if (excelExtensions.has(ext)) {
    const structuredSpreadsheetData = extractSpreadsheetStructuredData(
      filePath,
      entityType,
      fallback
    );

    if (structuredSpreadsheetData) {
      return structuredSpreadsheetData;
    }

    extractedText = extractSpreadsheetText(filePath);
  } else {
    throw new Error('Unsupported document format');
  }

  if (!extractedText.trim()) {
    return {
      ...fallback,
      confidenceNote: 'No readable text found in uploaded file.'
    };
  }

  if (!hasOpenRouterApiKey()) {
    return {
      ...fallback,
      confidenceNote:
        'Document text was read, but AI field extraction is unavailable because OPENROUTER_API_KEY is not configured.'
    };
  }

  const prompt = `
You are extracting inventory data from uploaded document text.

Return ONLY raw JSON.
Do NOT wrap the response in markdown.
Do NOT add explanation before or after JSON.
Do not invent exact values.
If a field is not present in the document text, return empty string.

Entity type: ${entityType}

Expected JSON shape:
{
  "entityType": "${entityType}",
  "confidenceNote": "short note",
  "data": ${buildExpectedShape(entityType)}
}

Document text:
${extractedText.slice(0, 12000)}
  `.trim();

  const completion = await aiClient.chat.completions.create(
    {
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: prompt
        }
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

  const rawContent = completion?.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error('Empty AI response content received from OpenRouter');
  }

  const parsed = parseJsonSafely<ImageAnalysisResult>(
    typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent),
    fallback
  );

  return {
    entityType,
    confidenceNote:
      parsed?.confidenceNote || 'Extracted from uploaded document text.',
    data: parsed?.data || fallback.data
  };
};

export const analyzeInventoryImage = async (
  filePath: string,
  entityType: EntityType
): Promise<ImageAnalysisResult> => {
  const fallback = createFallbackResult(entityType);
  const ext = path.extname(filePath).toLowerCase();

  try {
    if (imageExtensions.has(ext)) {
      return await analyzeWithVision(filePath, entityType, fallback);
    }

    if (ext === '.pdf' || excelExtensions.has(ext)) {
      return await analyzeTextDocument(filePath, entityType, fallback);
    }

    return {
      ...fallback,
      confidenceNote: 'Unsupported upload format.'
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'File analysis failed';

    return {
      ...fallback,
      confidenceNote: message
    };
  }
};
