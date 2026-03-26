import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { InventoryService } from '../../core/services/inventory.service';
import { InventoryTransaction } from '../../core/models/inventory.model';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatProgressSpinnerModule, MatSnackBarModule],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss']
})
export class TransactionsComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly snackBar = inject(MatSnackBar);

  transactions = signal<InventoryTransaction[]>([]);
  isLoading = signal(false);

  displayedColumns = ['product', 'type', 'quantity', 'previousQuantity', 'newQuantity', 'createdAt'];

  ngOnInit() {
    this.loadTransactions();
  }

  loadTransactions() {
    this.isLoading.set(true);
    this.inventoryService.getTransactions().subscribe({
      next: (res) => { this.isLoading.set(false); if (res.success && res.data) this.transactions.set(res.data); },
      error: () => { this.isLoading.set(false); this.snackBar.open('Unable to load transactions', 'Close', { duration: 3000, panelClass: ['error-snackbar'] }); }
    });
  }
}
