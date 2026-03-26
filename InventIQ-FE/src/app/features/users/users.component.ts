import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserManagementService } from '../../core/services/user-management.service';
import {
  AppRole,
  CreateManagedUserPayload,
  ManagedUser,
  UpdateManagedUserPayload
} from '../../core/models/user-management.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserManagementService);
  private readonly snackBar = inject(MatSnackBar);

  readonly roles: AppRole[] = ['admin', 'manager', 'supervisor', 'user'];
  readonly users = signal<ManagedUser[]>([]);
  readonly isLoading = signal(false);
  readonly editingUserId = signal<string | null>(null);

  readonly userForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    role: ['user' as AppRole, Validators.required],
    isActive: [true]
  });

  readonly isEditing = computed(() => Boolean(this.editingUserId()));

  constructor() {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.userService.getUsers().subscribe({
      next: (response) => {
        this.users.set(response.data || []);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.snackBar.open(error.message || 'Failed to load users', 'Close', {
          duration: 3000
        });
      }
    });
  }

  editUser(user: ManagedUser): void {
    this.editingUserId.set(user.id || user._id || null);
    this.userForm.patchValue({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive
    });
  }

  resetForm(): void {
    this.editingUserId.set(null);
    this.userForm.reset({
      name: '',
      email: '',
      password: '',
      role: 'user',
      isActive: true
    });
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const value = this.userForm.getRawValue();
    const editingId = this.editingUserId();

    if (editingId) {
      const payload: UpdateManagedUserPayload = {
        name: value.name || '',
        email: value.email || '',
        role: (value.role || 'user') as AppRole,
        isActive: Boolean(value.isActive),
        ...(value.password ? { password: value.password } : {})
      };

      this.userService.updateUser(editingId, payload).subscribe({
        next: () => {
          this.snackBar.open('User updated successfully', 'Close', {
            duration: 3000
          });
          this.resetForm();
          this.loadUsers();
        },
        error: (error) => {
          this.snackBar.open(error.message || 'Failed to update user', 'Close', {
            duration: 3000
          });
        }
      });

      return;
    }

    if (!value.password) {
      this.snackBar.open('Password is required for new users', 'Close', {
        duration: 3000
      });
      return;
    }

    const payload: CreateManagedUserPayload = {
      name: value.name || '',
      email: value.email || '',
      password: value.password,
      role: (value.role || 'user') as AppRole,
      isActive: Boolean(value.isActive)
    };

    this.userService.createUser(payload).subscribe({
      next: () => {
        this.snackBar.open('User created successfully', 'Close', {
          duration: 3000
        });
        this.resetForm();
        this.loadUsers();
      },
      error: (error) => {
        this.snackBar.open(error.message || 'Failed to create user', 'Close', {
          duration: 3000
        });
      }
    });
  }

  deleteUser(user: ManagedUser): void {
    const id = user.id || user._id;
    if (!id || !confirm(`Delete user ${user.name}?`)) {
      return;
    }

    this.userService.deleteUser(id).subscribe({
      next: () => {
        this.snackBar.open('User deleted successfully', 'Close', {
          duration: 3000
        });
        if (this.editingUserId() === id) {
          this.resetForm();
        }
        this.loadUsers();
      },
      error: (error) => {
        this.snackBar.open(error.message || 'Failed to delete user', 'Close', {
          duration: 3000
        });
      }
    });
  }
}
