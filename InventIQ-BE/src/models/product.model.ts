import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  sku: string;
  description?: string;
  category: Types.ObjectId;
  supplier?: Types.ObjectId;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  reorderLevel: number;
  unit?: string;
  barcode?: string;
  brand?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier'
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      default: 0,
      min: 0
    },
    reorderLevel: {
      type: Number,
      default: 5,
      min: 0
    },
    unit: {
      type: String,
      trim: true
    },
    barcode: {
      type: String,
      trim: true
    },
    brand: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const Product = mongoose.model<IProduct>('Product', productSchema);

export default Product;