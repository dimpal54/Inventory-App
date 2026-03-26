import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  CreateManagedUserPayload,
  UpdateManagedUserPayload,
  UserResponse,
  UsersResponse
} from '../models/user-management.model';

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  getUsers(): Observable<UsersResponse> {
    return this.http
      .get<UsersResponse>(this.baseUrl)
      .pipe(catchError(this.handleError));
  }

  createUser(payload: CreateManagedUserPayload): Observable<UserResponse> {
    return this.http
      .post<UserResponse>(this.baseUrl, payload)
      .pipe(catchError(this.handleError));
  }

  updateUser(id: string, payload: UpdateManagedUserPayload): Observable<UserResponse> {
    return this.http
      .put<UserResponse>(`${this.baseUrl}/${id}`, payload)
      .pipe(catchError(this.handleError));
  }

  deleteUser(id: string): Observable<UserResponse> {
    return this.http
      .delete<UserResponse>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    const errorMessage = error.error?.message || `Error Code: ${error.status}`;
    return throwError(() => new Error(errorMessage));
  }
}
