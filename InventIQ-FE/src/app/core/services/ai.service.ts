import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ===== Chat Interfaces =====
export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  loading?: boolean;
  action?: string;
  data?: any;
  timestamp: Date;
  error?: boolean;
  imageUrl?: string; // For uploaded images
  confirmationDetails?: any; // For extracted data confirmation
}

export interface AIChatResponse {
  success: boolean;
  reply: string;
  action: string;
  data: any;
  missingFields?: string[];
}

export interface InventorySummary {
  totalProducts: number;
  totalCategories: number;
  totalSuppliers: number;
  lowStockCount: number;
  outOfStockCount: number;
}

// ===== Image Analysis Interfaces =====
export type EntityType = 'product' | 'category' | 'supplier';

export interface ExtractedProduct {
  name: string;
  brand?: string;
  barcode?: string;
  category?: string;
  description?: string;
  unit?: string;
}

export interface ExtractedCategory {
  name: string;
  description?: string;
}

export interface ExtractedSupplier {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export type ExtractedData = ExtractedProduct | ExtractedCategory | ExtractedSupplier;

export interface ImageAnalysisResult {
  entityType: EntityType;
  confidenceNote: string;
  data: ExtractedData;
  items?: ExtractedData[];
}

export interface AIImageAnalysisResponse {
  success: boolean;
  message?: string;
  result: ImageAnalysisResult;
  missingFields?: string[];
  requiresUserInput?: boolean;
}

// ===== Entity Create Interfaces =====
export interface CreateProductPayload {
  name: string;
  brand?: string;
  barcode?: string;
  category?: string;
  description?: string;
  unit?: string;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
}

export interface CreateSupplierPayload {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface EntityCreateResponse {
  success: boolean;
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private readonly baseUrl = `${environment.apiUrl}/ai`;
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  sendMessage(message: string): Observable<AIChatResponse> {
    return this.http.post<AIChatResponse>(`${this.baseUrl}/chat`, { message });
  }

  analyzeImage(
    file: File,
    entityType: EntityType
  ): Observable<AIImageAnalysisResponse> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('entityType', entityType);
    return this.http.post<AIImageAnalysisResponse>(
      `${this.baseUrl}/analyze-image`,
      formData
    );
  }

  createProduct(payload: CreateProductPayload): Observable<EntityCreateResponse> {
    return this.http.post<EntityCreateResponse>(
      `${this.apiUrl}/products`,
      payload
    );
  }

  createCategory(payload: CreateCategoryPayload): Observable<EntityCreateResponse> {
    return this.http.post<EntityCreateResponse>(
      `${this.apiUrl}/categories`,
      payload
    );
  }

  createSupplier(payload: CreateSupplierPayload): Observable<EntityCreateResponse> {
    return this.http.post<EntityCreateResponse>(
      `${this.apiUrl}/suppliers`,
      payload
    );
  }

  completeEntityFromAI(
    entityType: EntityType,
    data: ExtractedData | Record<string, any>
  ): Observable<EntityCreateResponse> {
    return this.http.post<EntityCreateResponse>(`${this.baseUrl}/complete-entity`, {
      entityType,
      data
    });
  }
}
