import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { SupplierService } from '../../core/services/supplier.service';
import { Product } from '../../core/models/product.model';
import { Category } from '../../core/models/category.model';
import { Supplier } from '../../core/models/supplier.model';
import { ProductFormDialogComponent } from './product-form-dialog.component';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly supplierService = inject(SupplierService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly permissionService = inject(PermissionService);

  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  suppliers = signal<Supplier[]>([]);
  isLoading = signal(false);
  get displayedColumns(): string[] {
    return this.permissionService.canManageInventory()
      ? ['name', 'sku', 'category', 'supplier', 'quantity', 'unitPrice', 'reorderLevel', 'actions']
      : ['name', 'sku', 'category', 'supplier', 'quantity', 'unitPrice', 'reorderLevel'];
  }

  canManageInventory(): boolean {
    return this.permissionService.canManageInventory();
  }

  ngOnInit() {
    this.loadLookups();
    this.loadProducts();
  }

  loadLookups() {
    this.categoryService.getCategories().subscribe({
      next: (res) => { if (res.success && res.data) this.categories.set(res.data); },
      error: () => this.snackBar.open('Failed to load categories', 'Close', { duration: 3000, panelClass: ['error-snackbar'] })
    });

    this.supplierService.getSuppliers().subscribe({
      next: (res) => { if (res.success && res.data) this.suppliers.set(res.data); },
      error: () => this.snackBar.open('Failed to load suppliers', 'Close', { duration: 3000, panelClass: ['error-snackbar'] })
    });
  }
  getCategoryName(categoryValue: Product['category']) {
    if (!categoryValue) return '';
    if (typeof categoryValue === 'object') return categoryValue.name;
    const category = this.categories().find(c => c._id === categoryValue);
    return category ? category.name : '';
  }

  getSupplierName(supplierValue: Product['supplier']) {
    if (!supplierValue) return '';
    if (typeof supplierValue === 'object') return supplierValue.name;
    const supplier = this.suppliers().find(s => s._id === supplierValue);
    return supplier ? supplier.name : '';
  }

  loadProducts() {
    this.isLoading.set(true);
    this.productService.getProducts().subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success && response.data) this.products.set(response.data);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackBar.open('Failed to load products', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
      }
    });
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(ProductFormDialogComponent, {
      width: '700px', data: {
        categories: this.categories(),
        suppliers: this.suppliers()
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.productService.createProduct(result as Omit<Product, '_id'>).subscribe({
          next: (res) => {
            if (res.success) {
              this.snackBar.open('Product created', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
              this.loadProducts();
            }
          },
          error: () => this.snackBar.open('Failed to create product', 'Close', { duration: 3000, panelClass: ['error-snackbar'] })
        });
      }
    });
  }

  openEditDialog(product: Product) {
    const dialogRef = this.dialog.open(ProductFormDialogComponent, {
      width: '700px',
      data: {
        product,
        categories: this.categories(),
        suppliers: this.suppliers()
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && product._id) {
        this.productService.updateProduct(product._id, result).subscribe({
          next: (res) => {
            if (res.success) {
              this.snackBar.open('Product updated', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
              this.loadProducts();
            }
          },
          error: () => this.snackBar.open('Failed to update product', 'Close', { duration: 3000, panelClass: ['error-snackbar'] })
        });
      }
    });
  }

  deleteProduct(product: Product) {
    if (!product._id || !confirm(`Delete product ${product.name}?`)) return;

    this.productService.deleteProduct(product._id).subscribe({
      next: (res) => {
        if (res.success) {
          this.snackBar.open('Product deleted', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
          this.loadProducts();
        }
      },
      error: () => this.snackBar.open('Failed to delete product', 'Close', { duration: 3000, panelClass: ['error-snackbar'] })
    });
  }
}
