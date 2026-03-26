import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Product, ProductResponse, ProductsResponse } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);

  getProducts(): Observable<ProductsResponse> {
    return this.http.get<ProductsResponse>(`${environment.apiUrl}/products`)
      .pipe(catchError(this.handleError));
  }

  getProduct(id: string): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`${environment.apiUrl}/products/${id}`)
      .pipe(catchError(this.handleError));
  }

  createProduct(product: Omit<Product, '_id'>): Observable<ProductResponse> {
    return this.http.post<ProductResponse>(`${environment.apiUrl}/products`, product)
      .pipe(catchError(this.handleError));
  }

  updateProduct(id: string, product: Partial<Product>): Observable<ProductResponse> {
    return this.http.put<ProductResponse>(`${environment.apiUrl}/products/${id}`, product)
      .pipe(catchError(this.handleError));
  }

  deleteProduct(id: string): Observable<ProductResponse> {
    return this.http.delete<ProductResponse>(`${environment.apiUrl}/products/${id}`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      errorMessage = error.error?.message || `Error Code: ${error.status}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}