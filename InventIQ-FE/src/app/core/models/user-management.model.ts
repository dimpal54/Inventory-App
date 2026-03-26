export type AppRole = 'admin' | 'manager' | 'supervisor' | 'user';

export interface ManagedUser {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: AppRole;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UsersResponse {
  success: boolean;
  message?: string;
  data?: ManagedUser[];
}

export interface UserResponse {
  success: boolean;
  message?: string;
  data?: ManagedUser;
}

export interface CreateManagedUserPayload {
  name: string;
  email: string;
  password: string;
  role: AppRole;
  isActive: boolean;
}

export interface UpdateManagedUserPayload {
  name: string;
  email: string;
  password?: string;
  role: AppRole;
  isActive: boolean;
}
