import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Category, CategoryResponse, CategoriesResponse } from '../models/category.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private http = inject(HttpClient);

  getCategories(): Observable<CategoriesResponse> {
    return this.http.get<CategoriesResponse>(`${environment.apiUrl}/categories`)
      .pipe(catchError(this.handleError));
  }

  getCategory(id: string): Observable<CategoryResponse> {
    return this.http.get<CategoryResponse>(`${environment.apiUrl}/categories/${id}`)
      .pipe(catchError(this.handleError));
  }

  createCategory(category: Omit<Category, '_id'>): Observable<CategoryResponse> {
    return this.http.post<CategoryResponse>(`${environment.apiUrl}/categories`, category)
      .pipe(catchError(this.handleError));
  }

  updateCategory(id: string, category: Partial<Category>): Observable<CategoryResponse> {
    return this.http.put<CategoryResponse>(`${environment.apiUrl}/categories/${id}`, category)
      .pipe(catchError(this.handleError));
  }

  deleteCategory(id: string): Observable<CategoryResponse> {
    return this.http.delete<CategoryResponse>(`${environment.apiUrl}/categories/${id}`)
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