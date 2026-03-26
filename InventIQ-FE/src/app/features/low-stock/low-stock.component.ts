import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { InventoryService } from '../../core/services/inventory.service';
import { LowStockItem } from '../../core/models/inventory.model';

@Component({
  selector: 'app-low-stock',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatProgressSpinnerModule, MatSnackBarModule],
  templateUrl: './low-stock.component.html',
  styleUrls: ['./low-stock.component.scss']
})
export class LowStockComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly snackBar = inject(MatSnackBar);

  items = signal<LowStockItem[]>([]);
  isLoading = signal(false);
  displayedColumns = ['name', 'sku', 'quantity', 'minQuantity', 'reorderLevel'];

  ngOnInit() {
    this.loadLowStock();
  }

  loadLowStock() {
    this.isLoading.set(true);
    this.inventoryService.getLowStock().subscribe({
      next: (res) => { this.isLoading.set(false); if (res.success && res.data) this.items.set(res.data); },
      error: () => { this.isLoading.set(false); this.snackBar.open('Unable to load low stock items', 'Close', { duration: 3000, panelClass: ['error-snackbar'] }); }
    });
  }
}
