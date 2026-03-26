import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

import { Product } from '../../core/models/product.model';
import { Category } from '../../core/models/category.model';
import { Supplier } from '../../core/models/supplier.model';

interface ProductFormDialogData {
  product?: Product;
  categories: Category[];
  suppliers: Supplier[];
}

@Component({
  selector: 'app-product-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './product-form-dialog.component.html',
  styleUrls: ['./product-form-dialog.component.scss']
})
export class ProductFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ProductFormDialogComponent>);
  private readonly snackBar = inject(MatSnackBar);
  private readonly data = inject<ProductFormDialogData>(MAT_DIALOG_DATA);

  isEdit = signal(!!this.data?.product);
  isLoading = signal(false);

  private readonly selectedCategory =
    typeof this.data?.product?.category === 'object'
      ? this.data.product.category?._id
      : this.data?.product?.category || '';

  private readonly selectedSupplier =
    typeof this.data?.product?.supplier === 'object'
      ? this.data.product.supplier?._id
      : this.data?.product?.supplier || '';

  productForm: FormGroup = this.fb.group({
    name: [this.data?.product?.name || '', [Validators.required, Validators.minLength(3)]],
    description: [this.data?.product?.description || ''],
    category: [this.selectedCategory, [Validators.required]],
    supplier: [this.selectedSupplier, [Validators.required]],
    sku: [this.data?.product?.sku || '', [Validators.required, Validators.minLength(2)]],
    barcode: [this.data?.product?.barcode || ''],
    quantity: [this.data?.product?.quantity ?? 0, [Validators.required, Validators.min(0)]],
    costPrice: [this.data?.product?.costPrice ?? 0, [Validators.required, Validators.min(0)]],
    sellingPrice: [this.data?.product?.sellingPrice ?? 0, [Validators.required, Validators.min(0)]],
    reorderLevel: [this.data?.product?.reorderLevel ?? 0, [Validators.required, Validators.min(0)]]
  });

  get categories() {
    return this.data?.categories || [];
  }

  get suppliers() {
    return this.data?.suppliers || [];
  }

  onSubmit(): void {
    if (this.productForm.invalid) {
      this.markAllTouched();
      return;
    }

    this.isLoading.set(true);
    const payload = this.productForm.value as Product;

    setTimeout(() => {
      this.isLoading.set(false);
      const result: Partial<Product> = {
        ...payload,
        _id: this.data?.product?._id
      };
      this.dialogRef.close(result);
      this.snackBar.open(`${this.isEdit() ? 'Product updated' : 'Product created'} successfully`, 'Close', { duration: 3000 });
    }, 500);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private markAllTouched(): void {
    Object.values(this.productForm.controls).forEach(control => control.markAsTouched());
  }

  getError(field: string): string {
    const control = this.productForm.get(field);
    if (control?.hasError('required')) return 'This field is required';
    if (control?.hasError('minlength')) return 'Please enter a longer value';
    if (control?.hasError('min')) return 'Value must be non-negative';
    return '';
  }
}
