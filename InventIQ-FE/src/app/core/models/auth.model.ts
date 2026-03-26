export interface LoginPayload {
  email: string;
  password: string;
}

export interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

export interface MeResponse {
  success: boolean;
  data: User;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}