import Product from '../models/product.model';
import Category from '../models/category.model';
import Supplier from '../models/supplier.model';

export const findCategoryByName = async (name: string) => {
    return Category.findOne({ name: new RegExp(`^${name}$`, 'i') });
};

export const findSupplierByName = async (name: string) => {
    return Supplier.findOne({ name: new RegExp(`^${name}$`, 'i') });
};

export const createCategoryTool = async (name: string, description?: string) => {
    const existing = await findCategoryByName(name);
    if (existing) return existing;

    return Category.create({ name, description });
};

export const createSupplierTool = async (data: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
}) => {
    const existing = await findSupplierByName(data.name);
    if (existing) return existing;

    return Supplier.create(data);
};

export const createProductTool = async (data: {
    name: string;
    sku: string;
    description?: string;
    category: string;
    supplier?: string;
    costPrice: number;
    sellingPrice: number;
    quantity?: number;
    reorderLevel?: number;
    barcode?: string;
    brand?: string;
    unit?: string;
}) => {
    return Product.create({
        ...data,
        quantity: data.quantity ?? 0,
        reorderLevel: data.reorderLevel ?? 5
    });
};

export const getLowStockProductsTool = async () => {
    return Product.find({
        $expr: { $lte: ['$quantity', '$reorderLevel'] }
    })
        .populate('category', 'name')
        .populate('supplier', 'name')
        .sort({ quantity: 1 });
};

export const getInventorySummaryTool = async () => {
    const totalProducts = await Product.countDocuments();
    const totalCategories = await Category.countDocuments();
    const totalSuppliers = await Supplier.countDocuments();
    const lowStockCount = await Product.countDocuments({
        $expr: { $lte: ['$quantity', '$reorderLevel'] }
    });

    return {
        totalProducts,
        totalCategories,
        totalSuppliers,
        lowStockCount
    };
};

export const searchProductsTool = async (query: string) => {
    return Product.find({
        $or: [
            { name: new RegExp(query, 'i') },
            { sku: new RegExp(query, 'i') },
            { barcode: new RegExp(query, 'i') },
            { brand: new RegExp(query, 'i') }
        ]
    })
        .populate('category', 'name')
        .populate('supplier', 'name')
        .limit(20);
};