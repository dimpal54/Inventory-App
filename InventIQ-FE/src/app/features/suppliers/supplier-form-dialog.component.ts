import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

import { Supplier } from '../../core/models/supplier.model';

@Component({
  selector: 'app-supplier-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './supplier-form-dialog.component.html',
  styleUrls: ['./supplier-form-dialog.component.scss']
})
export class SupplierFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<SupplierFormDialogComponent>);
  private readonly snackBar = inject(MatSnackBar);
  private readonly data = inject<{ supplier?: Supplier }>(MAT_DIALOG_DATA);

  supplierForm: FormGroup;
  isLoading = signal(false);
  isEdit = signal(false);

  constructor() {
    this.isEdit.set(!!this.data?.supplier);

    this.supplierForm = this.fb.group({
      name: [this.data?.supplier?.name || '', [Validators.required, Validators.minLength(2)]],
      email: [this.data?.supplier?.email || '', [Validators.required, Validators.email]],
      phone: [this.data?.supplier?.phone || '', [Validators.pattern(/^\+?[1-9]\d{0,15}$/)]],
      address: [this.data?.supplier?.address || '']
    });
  }

  onSubmit(): void {
    if (this.supplierForm.valid) {
      this.isLoading.set(true);

      const supplierData: Partial<Supplier> = {
        ...this.supplierForm.value,
        _id: this.data?.supplier?._id
      };

      // Simulate API call delay
      setTimeout(() => {
        this.isLoading.set(false);
        this.dialogRef.close(supplierData);
        this.snackBar.open(
          `Supplier ${this.isEdit() ? 'updated' : 'created'} successfully`,
          'Close',
          { duration: 3000 }
        );
      }, 1000);
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.supplierForm.controls).forEach(key => {
      const control = this.supplierForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.supplierForm.get(fieldName);
    if (control?.hasError('required')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (control?.hasError('minlength')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least 2 characters`;
    }
    if (control?.hasError('pattern')) {
      return 'Please enter a valid phone number';
    }
    return '';
  }
}