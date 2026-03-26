import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { InventoryService } from '../../core/services/inventory.service';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/product.model';
import { InventoryTransaction } from '../../core/models/inventory.model';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTableModule
  ],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly productService = inject(ProductService);
  private readonly snackBar = inject(MatSnackBar);

  products = signal<Product[]>([]);
  transactions = signal<InventoryTransaction[]>([]);
  isLoading = signal(false);

  stockInForm: FormGroup;
  stockOutForm: FormGroup;
  adjustForm: FormGroup;

  constructor(private readonly fb: FormBuilder) {
    this.stockInForm = this.fb.group({ productId: ['', Validators.required], quantity: [0, [Validators.required, Validators.min(1)]], reason: [''], reference: [''] });
    this.stockOutForm = this.fb.group({ productId: ['', Validators.required], quantity: [0, [Validators.required, Validators.min(1)]], reason: [''], reference: [''] });
    this.adjustForm = this.fb.group({ productId: ['', Validators.required], quantity: [0, Validators.required], reason: ['', Validators.required], reference: [''] });
  }

  ngOnInit() {
    this.loadProducts();
    this.loadTransactions();
  }

  loadProducts() {
    this.productService.getProducts().subscribe({
      next: (res) => { if (res.success && res.data) this.products.set(res.data); },
      error: () => this.snackBar.open('Failed to load products', 'Close', { duration: 3000, panelClass: ['error-snackbar'] })
    });
  }

  loadTransactions() {
    this.isLoading.set(true);
    this.inventoryService.getTransactions().subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) this.transactions.set(res.data);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackBar.open('Failed to load transactions', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
      }
    });
  }

  stockIn() {
    if (this.stockInForm.invalid) { this.stockInForm.markAllAsTouched(); return; }
    this.inventoryService.stockIn(this.stockInForm.value).subscribe({
      next: (res) => {
        if (res.success) {
          this.snackBar.open('Stocked in successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
          this.stockInForm.reset({ productId: '', quantity: 0, reason: '', reference: '' });
          this.loadProducts();
          this.loadTransactions();
        }
      },
      error: () => this.snackBar.open('Stock in failed', 'Close', { duration: 3000, panelClass: ['error-snackbar'] })
    });
  }

  stockOut() {
    if (this.stockOutForm.invalid) { this.stockOutForm.markAllAsTouched(); return; }
    this.inventoryService.stockOut(this.stockOutForm.value).subscribe({
      next: (res) => {
        if (res.success) {
          this.snackBar.open('Stocked out successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
          this.stockOutForm.reset({ productId: '', quantity: 0, reason: '', reference: '' });
          this.loadProducts();
          this.loadTransactions();
        }
      },
      error: () => this.snackBar.open('Stock out failed', 'Close', { duration: 3000, panelClass: ['error-snackbar'] })
    });
  }

  adjustStock() {
    if (this.adjustForm.invalid) { this.adjustForm.markAllAsTouched(); return; }
    this.inventoryService.adjustStock(this.adjustForm.value).subscribe({
      next: (res) => {
        if (res.success) {
          this.snackBar.open('Stock adjusted successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
          this.adjustForm.reset({ productId: '', quantity: 0, reason: '', reference: '' });
          this.loadProducts();
          this.loadTransactions();
        }
      },
      error: () => this.snackBar.open('Stock adjust failed', 'Close', { duration: 3000, panelClass: ['error-snackbar'] })
    });
  }
}
