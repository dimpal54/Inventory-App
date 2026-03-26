import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CategoryService } from '../../core/services/category.service';

@Component({
  selector: 'app-category-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './category-form-dialog.component.html',
  styleUrl: './category-form-dialog.component.scss'
})
export class CategoryFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly dialogRef = inject(MatDialogRef<CategoryFormDialogComponent>);
  private readonly data = inject(MAT_DIALOG_DATA);

  categoryForm: FormGroup;
  isLoading = signal(false);
  isEdit = signal(false);

  constructor() {
    this.isEdit.set(!!this.data.category);

    this.categoryForm = this.fb.group({
      name: [this.data.category?.name || '', [Validators.required, Validators.minLength(2)]],
      description: [this.data.category?.description || '']
    });
  }

  onSubmit() {
    if (this.categoryForm.valid) {
      this.isLoading.set(true);
      const formData = this.categoryForm.value;

      const request = this.isEdit()
        ? this.categoryService.updateCategory(this.data.category._id, formData)
        : this.categoryService.createCategory(formData);

      request.subscribe({
        next: (response) => {
          this.isLoading.set(false);
          if (response.success) {
            this.dialogRef.close(true);
          }
        },
        error: () => {
          this.isLoading.set(false);
        }
      });
    } else {
      this.categoryForm.markAllAsTouched();
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}