import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IStockTransaction extends Document {
  product: Types.ObjectId;
  type: 'stock_in' | 'stock_out' | 'adjustment' | 'sale' | 'purchase' | 'return';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  note?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const stockTransactionSchema = new Schema<IStockTransaction>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    type: {
      type: String,
      enum: ['stock_in', 'stock_out', 'adjustment', 'sale', 'purchase', 'return'],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    previousQuantity: {
      type: Number,
      required: true
    },
    newQuantity: {
      type: Number,
      required: true
    },
    note: {
      type: String,
      trim: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

const StockTransaction = mongoose.model<IStockTransaction>(
  'StockTransaction',
  stockTransactionSchema
);

export default StockTransaction;