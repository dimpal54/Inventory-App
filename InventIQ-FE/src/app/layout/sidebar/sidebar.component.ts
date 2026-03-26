import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSidenavModule } from '@angular/material/sidenav';
import { AuthService } from '../../core/services/auth.service';
import { PermissionService } from '../../core/services/permission.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatListModule,
    MatIconModule,
    MatDividerModule,
    MatSidenavModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly permissionService = inject(PermissionService);

  menuItems: MenuItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Categories', icon: 'category', route: '/categories' },
    { label: 'Suppliers', icon: 'business', route: '/suppliers' },
    { label: 'Products', icon: 'inventory', route: '/products' },
    { label: 'Inventory', icon: 'warehouse', route: '/inventory' },
    { label: 'Stock Transactions', icon: 'receipt_long', route: '/transactions' },
    { label: 'Low Stock', icon: 'warning', route: '/low-stock' },
    { label: 'Out of Stock', icon: 'error', route: '/out-of-stock' },
    { label: 'AI Assistant', icon: 'smart_toy', route: '/ai-assistant' },
    { label: 'Profile', icon: 'person', route: '/profile' },
    { label: 'Users', icon: 'group', route: '/users', adminOnly: true },
    { label: 'Role Access', icon: 'shield', route: '/role-access', adminOnly: true }
  ];

  get visibleMenuItems(): MenuItem[] {
    return this.menuItems.filter((item) => !item.adminOnly || this.isAdmin());
  }

  get currentUserName(): string {
    return this.authService.getCurrentUser()?.name || 'User';
  }

  get currentUserRole(): string {
    const role = this.permissionService.getCurrentRole();

    if (!role) {
      return 'User';
    }

    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  isAdmin(): boolean {
    return this.permissionService.getCurrentRole() === 'admin';
  }
}
