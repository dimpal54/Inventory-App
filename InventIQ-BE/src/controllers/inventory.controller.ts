import { Request, Response } from 'express';
import Product from '../models/product.model.js';
import StockTransaction from '../models/stock-transaction.model.js';

type TransactionType = 'stock_in' | 'stock_out' | 'adjustment';

export const stockIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, quantity, note } = req.body;

    if (!productId || quantity === undefined) {
      res.status(400).json({
        success: false,
        message: 'productId and quantity are required'
      });
      return;
    }

    const qty = Number(quantity);

    if (Number.isNaN(qty) || qty <= 0) {
      res.status(400).json({
        success: false,
        message: 'Quantity must be greater than 0'
      });
      return;
    }

    const product = await Product.findById(productId);

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    const previousQuantity = product.quantity;
    const newQuantity = previousQuantity + qty;

    product.quantity = newQuantity;
    await product.save();

    await StockTransaction.create({
      product: product._id,
      type: 'stock_in',
      quantity: qty,
      previousQuantity,
      newQuantity,
      note: note || 'Stock added',
      createdBy: req.user?._id
    });

    res.status(200).json({
      success: true,
      message: 'Stock added successfully',
      data: {
        productId: product._id,
        productName: product.name,
        previousQuantity,
        addedQuantity: qty,
        newQuantity
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

export const stockOut = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, quantity, note } = req.body;

    if (!productId || quantity === undefined) {
      res.status(400).json({
        success: false,
        message: 'productId and quantity are required'
      });
      return;
    }

    const qty = Number(quantity);

    if (Number.isNaN(qty) || qty <= 0) {
      res.status(400).json({
        success: false,
        message: 'Quantity must be greater than 0'
      });
      return;
    }

    const product = await Product.findById(productId);

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    const previousQuantity = product.quantity;

    if (previousQuantity < qty) {
      res.status(400).json({
        success: false,
        message: 'Insufficient stock'
      });
      return;
    }

    const newQuantity = previousQuantity - qty;

    product.quantity = newQuantity;
    await product.save();

    await StockTransaction.create({
      product: product._id,
      type: 'stock_out',
      quantity: qty,
      previousQuantity,
      newQuantity,
      note: note || 'Stock removed',
      createdBy: req.user?._id
    });

    res.status(200).json({
      success: true,
      message: 'Stock removed successfully',
      data: {
        productId: product._id,
        productName: product.name,
        previousQuantity,
        removedQuantity: qty,
        newQuantity
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

export const adjustStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, quantity, note } = req.body;

    if (!productId || quantity === undefined) {
      res.status(400).json({
        success: false,
        message: 'productId and quantity are required'
      });
      return;
    }

    const qty = Number(quantity);

    if (Number.isNaN(qty) || qty < 0) {
      res.status(400).json({
        success: false,
        message: 'Quantity must be 0 or greater'
      });
      return;
    }

    const product = await Product.findById(productId);

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    const previousQuantity = product.quantity;
    const newQuantity = qty;

    product.quantity = newQuantity;
    await product.save();

    await StockTransaction.create({
      product: product._id,
      type: 'adjustment',
      quantity: Math.abs(newQuantity - previousQuantity),
      previousQuantity,
      newQuantity,
      note: note || 'Stock adjusted',
      createdBy: req.user?._id
    });

    res.status(200).json({
      success: true,
      message: 'Stock adjusted successfully',
      data: {
        productId: product._id,
        productName: product.name,
        previousQuantity,
        adjustedQuantity: newQuantity,
        newQuantity
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

export const getProductStockHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId).select('name sku quantity reorderLevel');

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    const history = await StockTransaction.find({ product: productId })
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        product,
        history
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

export const getAllStockTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, productId } = req.query;

    const filter: {
      type?: TransactionType;
      product?: string;
    } = {};

    if (
      typeof type === 'string' &&
      ['stock_in', 'stock_out', 'adjustment'].includes(type)
    ) {
      filter.type = type as TransactionType;
    }

    if (typeof productId === 'string' && productId.trim()) {
      filter.product = productId;
    }

    const transactions = await StockTransaction.find(filter)
      .populate('product', 'name sku quantity')
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: transactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

export const getLowStockProducts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await Product.find({
      $expr: { $lte: ['$quantity', '$reorderLevel'] },
      isActive: true
    })
      .populate('category', 'name')
      .populate('supplier', 'name companyName')
      .sort({ quantity: 1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

export const getOutOfStockProducts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await Product.find({
      quantity: 0,
      isActive: true
    })
      .populate('category', 'name')
      .populate('supplier', 'name companyName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};