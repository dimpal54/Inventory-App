import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SupplierService } from '../../core/services/supplier.service';
import { Supplier } from '../../core/models/supplier.model';
import { SupplierFormDialogComponent } from './supplier-form-dialog.component';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'app-suppliers',
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
  templateUrl: './suppliers.component.html',
  styleUrl: './suppliers.component.scss'
})
export class SuppliersComponent implements OnInit {
  private readonly supplierService = inject(SupplierService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly permissionService = inject(PermissionService);

  suppliers = signal<Supplier[]>([]);
  isLoading = signal(false);
  get displayedColumns(): string[] {
    return this.permissionService.canManageInventory()
      ? ['name', 'email', 'phone', 'createdAt', 'actions']
      : ['name', 'email', 'phone', 'createdAt'];
  }

  canManageInventory(): boolean {
    return this.permissionService.canManageInventory();
  }

  ngOnInit() {
    this.loadSuppliers();
  }

  loadSuppliers() {
    this.isLoading.set(true);
    this.supplierService.getSuppliers().subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success && response.data) {
          this.suppliers.set(response.data);
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.snackBar.open('Failed to load suppliers', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(SupplierFormDialogComponent, {
      width: '500px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.supplierService.createSupplier(result).subscribe({
          next: (response) => {
            if (response.success) {
              this.snackBar.open('Supplier created successfully', 'Close', {
                duration: 3000,
                panelClass: ['success-snackbar']
              });
              this.loadSuppliers();
            }
          },
          error: (error) => {
            this.snackBar.open('Failed to create supplier', 'Close', {
              duration: 3000,
              panelClass: ['error-snackbar']
            });
          }
        });
      }
    });
  }

  openEditDialog(supplier: Supplier) {
    const dialogRef = this.dialog.open(SupplierFormDialogComponent, {
      width: '500px',
      data: { supplier }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.supplierService.updateSupplier(supplier._id, result).subscribe({
          next: (response) => {
            if (response.success) {
              this.snackBar.open('Supplier updated successfully', 'Close', {
                duration: 3000,
                panelClass: ['success-snackbar']
              });
              this.loadSuppliers();
            }
          },
          error: (error) => {
            this.snackBar.open('Failed to update supplier', 'Close', {
              duration: 3000,
              panelClass: ['error-snackbar']
            });
          }
        });
      }
    });
  }

  deleteSupplier(supplier: Supplier) {
    if (confirm(`Are you sure you want to delete "${supplier.name}"?`)) {
      this.supplierService.deleteSupplier(supplier._id).subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open('Supplier deleted successfully', 'Close', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.loadSuppliers();
          }
        },
        error: (error) => {
          this.snackBar.open('Failed to delete supplier', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }
}
