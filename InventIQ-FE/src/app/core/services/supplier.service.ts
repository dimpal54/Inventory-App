import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Supplier, SupplierResponse, SuppliersResponse } from '../models/supplier.model';

@Injectable({
  providedIn: 'root'
})
export class SupplierService {
  private http = inject(HttpClient);

  getSuppliers(): Observable<SuppliersResponse> {
    return this.http.get<SuppliersResponse>(`${environment.apiUrl}/suppliers`)
      .pipe(catchError(this.handleError));
  }

  getSupplier(id: string): Observable<SupplierResponse> {
    return this.http.get<SupplierResponse>(`${environment.apiUrl}/suppliers/${id}`)
      .pipe(catchError(this.handleError));
  }

  createSupplier(supplier: Omit<Supplier, '_id'>): Observable<SupplierResponse> {
    return this.http.post<SupplierResponse>(`${environment.apiUrl}/suppliers`, supplier)
      .pipe(catchError(this.handleError));
  }

  updateSupplier(id: string | undefined, supplier: Partial<Supplier>): Observable<SupplierResponse> {
    if (!id) {
      return throwError(() => new Error('Supplier ID is required'));
    }
    return this.http.put<SupplierResponse>(`${environment.apiUrl}/suppliers/${id}`, supplier)
      .pipe(catchError(this.handleError));
  }

  deleteSupplier(id: string | undefined): Observable<SupplierResponse> {
    if (!id) {
      return throwError(() => new Error('Supplier ID is required'));
    }
    return this.http.delete<SupplierResponse>(`${environment.apiUrl}/suppliers/${id}`)
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