export interface Category {
  _id?: string;
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CategoryResponse {
  success: boolean;
  message?: string;
  data?: Category;
}

export interface CategoriesResponse {
  success: boolean;
  message?: string;
  data?: Category[];
}