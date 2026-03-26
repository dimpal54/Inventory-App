export interface InventoryTransaction {
  _id?: string;
  productId: string;
  product?: {
    _id: string;
    name: string;
    sku: string;
  };
  type: 'stock-in' | 'stock-out' | 'adjustment';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  reference?: string;
  createdBy?: string;
  createdAt?: Date;
}

export interface StockInData {
  productId: string;
  quantity: number;
  reason?: string;
  reference?: string;
}

export interface StockOutData {
  productId: string;
  quantity: number;
  reason?: string;
  reference?: string;
}

export interface StockAdjustData {
  productId: string;
  quantity: number;
  reason: string;
  reference?: string;
}

export interface InventoryResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export interface TransactionsResponse {
  success: boolean;
  message?: string;
  data?: InventoryTransaction[];
}

export interface LowStockItem {
  _id: string;
  name: string;
  sku: string;
  quantity: number;
  minQuantity: number;
  reorderLevel: number;
}

export interface LowStockResponse {
  success: boolean;
  message?: string;
  data?: LowStockItem[];
}

export interface OutOfStockItem {
  _id: string;
  name: string;
  sku: string;
  quantity: number;
  minQuantity: number;
}

export interface OutOfStockResponse {
  success: boolean;
  message?: string;
  data?: OutOfStockItem[];
}