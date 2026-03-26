import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoginPayload, LoginResponse, MeResponse, User } from '../models/auth.model';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private storage = inject(StorageService);

  login(payload: LoginPayload): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, payload)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            this.storage.setToken(response.data.token);
            this.storage.setUser(response.data.user);
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  register(payload: LoginPayload): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/register`, payload)
      .pipe(catchError(this.handleError));
  }

  getMe(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${environment.apiUrl}/auth/me`)
      .pipe(catchError(this.handleError));
  }

  logout(): void {
    this.storage.clear();
  }

  isLoggedIn(): boolean {
    return this.storage.isLoggedIn();
  }

  getCurrentUser(): User | null {
    return this.storage.getUser();
  }

  getToken(): string | null {
    return this.storage.getToken();
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