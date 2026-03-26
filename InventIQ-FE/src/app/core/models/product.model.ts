export interface Product {
  _id?: string;
  name: string;
  description?: string;
  category: string | {
    _id: string;
    name: string;
  };
  categoryDetails?: {
    _id: string;
    name: string;
  };
  supplier?: string | {
    _id: string;
    name: string;
    companyName?: string;
  };
  supplierDetails?: {
    _id: string;
    name: string;
  };
  sku: string;
  barcode?: string;
  brand?: string;
  unit?: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductResponse {
  success: boolean;
  message?: string;
  data?: Product;
}

export interface ProductsResponse {
  success: boolean;
  message?: string;
  data?: Product[];
}

export interface ProductFormData {
  name: string;
  description: string;
  category: string;
  supplier: string;
  sku: string;
  barcode: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
}
