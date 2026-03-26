export interface Supplier {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SupplierResponse {
  success: boolean;
  message?: string;
  data?: Supplier;
}

export interface SuppliersResponse {
  success: boolean;
  message?: string;
  data?: Supplier[];
}