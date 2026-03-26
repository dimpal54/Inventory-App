import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { InventoryService } from '../../core/services/inventory.service';
import { OutOfStockItem } from '../../core/models/inventory.model';

@Component({
  selector: 'app-out-of-stock',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatProgressSpinnerModule, MatSnackBarModule],
  templateUrl: './out-of-stock.component.html',
  styleUrls: ['./out-of-stock.component.scss']
})
export class OutOfStockComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly snackBar = inject(MatSnackBar);

  items = signal<OutOfStockItem[]>([]);
  isLoading = signal(false);
  displayedColumns = ['name', 'sku', 'quantity', 'minQuantity'];

  ngOnInit() {
    this.loadItems();
  }

  loadItems() {
    this.isLoading.set(true);
    this.inventoryService.getOutOfStock().subscribe({
      next: (res) => { this.isLoading.set(false); if (res.success && res.data) this.items.set(res.data); },
      error: () => { this.isLoading.set(false); this.snackBar.open('Unable to load out-of-stock products', 'Close', { duration: 3000, panelClass: ['error-snackbar'] }); }
    });
  }
}
