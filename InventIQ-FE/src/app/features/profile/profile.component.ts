import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PermissionService } from '../../core/services/permission.service';
import { User } from '../../core/models/auth.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSnackBarModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {
  private readonly snackBar = inject(MatSnackBar);
  private readonly authService = inject(AuthService);
  private readonly permissionService = inject(PermissionService);
  private readonly router = inject(Router);

  readonly user = signal<User | null>(this.authService.getCurrentUser());

  readonly displayRole = computed(() => {
    const role = this.permissionService.getCurrentRole();
    return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User';
  });

  readonly canManageInventory = computed(() =>
    this.permissionService.canManageInventory()
  );

  readonly permissionSummary = computed(() =>
    this.canManageInventory()
      ? 'Full inventory access: create, edit, delete, and AI-assisted actions.'
      : 'View-only access: browse inventory and use AI for insights only.'
  );

  readonly quickActions = computed(() => {
    if (this.canManageInventory()) {
      return [
        { label: 'Open AI Assistant', icon: 'smart_toy', route: '/ai-assistant' },
        { label: 'Manage Products', icon: 'inventory_2', route: '/products' },
        { label: 'Manage Suppliers', icon: 'business', route: '/suppliers' }
      ];
    }

    return [
      { label: 'View Dashboard', icon: 'dashboard', route: '/dashboard' },
      { label: 'Browse Products', icon: 'inventory_2', route: '/products' },
      { label: 'Ask AI for Data', icon: 'smart_toy', route: '/ai-assistant' }
    ];
  });

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  refreshProfile(): void {
    this.authService.getMe().subscribe({
      next: (response) => {
        this.user.set(response.data);
        this.snackBar.open('Profile refreshed', 'Close', { duration: 2500 });
      },
      error: () => {
        this.snackBar.open('Failed to refresh profile', 'Close', {
          duration: 2500
        });
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
