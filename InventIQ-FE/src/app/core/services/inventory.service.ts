import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  InventoryResponse,
  TransactionsResponse,
  LowStockResponse,
  OutOfStockResponse,
  StockInData,
  StockOutData,
  StockAdjustData
} from '../models/inventory.model';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private http = inject(HttpClient);

  stockIn(data: StockInData): Observable<InventoryResponse> {
    return this.http.post<InventoryResponse>(`${environment.apiUrl}/inventory/stock-in`, data)
      .pipe(catchError(this.handleError));
  }

  stockOut(data: StockOutData): Observable<InventoryResponse> {
    return this.http.post<InventoryResponse>(`${environment.apiUrl}/inventory/stock-out`, data)
      .pipe(catchError(this.handleError));
  }

  adjustStock(data: StockAdjustData): Observable<InventoryResponse> {
    return this.http.post<InventoryResponse>(`${environment.apiUrl}/inventory/adjust`, data)
      .pipe(catchError(this.handleError));
  }

  getTransactions(): Observable<TransactionsResponse> {
    return this.http.get<TransactionsResponse>(`${environment.apiUrl}/inventory/transactions`)
      .pipe(catchError(this.handleError));
  }

  getProductHistory(productId: string): Observable<TransactionsResponse> {
    return this.http.get<TransactionsResponse>(`${environment.apiUrl}/inventory/history/${productId}`)
      .pipe(catchError(this.handleError));
  }

  getLowStock(): Observable<LowStockResponse> {
    return this.http.get<LowStockResponse>(`${environment.apiUrl}/inventory/low-stock`)
      .pipe(catchError(this.handleError));
  }

  getOutOfStock(): Observable<OutOfStockResponse> {
    return this.http.get<OutOfStockResponse>(`${environment.apiUrl}/inventory/out-of-stock`)
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