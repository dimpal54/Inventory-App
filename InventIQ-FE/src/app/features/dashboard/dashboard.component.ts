import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { CategoryService } from '../../core/services/category.service';
import { SupplierService } from '../../core/services/supplier.service';
import { ProductService } from '../../core/services/product.service';
import { InventoryService } from '../../core/services/inventory.service';
import { User } from '../../core/models/auth.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly categoryService = inject(CategoryService);
  private readonly supplierService = inject(SupplierService);
  private readonly productService = inject(ProductService);
  private readonly inventoryService = inject(InventoryService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly http = inject(HttpClient);

  currentUser = signal<User | null>(null);
  isLoading = signal(false);
  apiResponse = signal<any>(null);

  // Summary stats
  totalCategories = signal(0);
  totalSuppliers = signal(0);
  totalProducts = signal(0);
  lowStockCount = signal(0);
  outOfStockCount = signal(0);

  ngOnInit() {
    this.loadUserData();
    this.loadSummaryStats();
  }

  private loadUserData() {
    this.authService.getMe().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.currentUser.set(response.data);
        }
      },
      error: (error) => {
        this.snackBar.open('Failed to load user data', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  private loadSummaryStats() {
    // Load categories count
    this.categoryService.getCategories().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.totalCategories.set(response.data.length);
        }
      }
    });

    // Load suppliers count
    this.supplierService.getSuppliers().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.totalSuppliers.set(response.data.length);
        }
      }
    });

    // Load products count
    this.productService.getProducts().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.totalProducts.set(response.data.length);
        }
      }
    });

    // Load low stock count
    this.inventoryService.getLowStock().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.lowStockCount.set(response.data.length);
        }
      }
    });

    // Load out of stock count
    this.inventoryService.getOutOfStock().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.outOfStockCount.set(response.data.length);
        }
      }
    });
  }

  logout() {
    this.authService.logout();
    this.snackBar.open('Logged out successfully', 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
    this.router.navigate(['/login']);
  }

  testProtected() {
    this.isLoading.set(true);
    this.http.get(`${environment.apiUrl}/test/protected`).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.apiResponse.set(response);
        this.snackBar.open('Protected route accessed successfully', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        this.isLoading.set(false);
        this.apiResponse.set({ error: error.message });
        this.snackBar.open('Failed to access protected route', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  testAdminOnly() {
    this.isLoading.set(true);
    this.http.get(`${environment.apiUrl}/test/admin-only`).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.apiResponse.set(response);
        this.snackBar.open('Admin route accessed successfully', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        this.isLoading.set(false);
        this.apiResponse.set({ error: error.message });
        this.snackBar.open('Failed to access admin route', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }
}