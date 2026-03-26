import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private readonly authService = inject(AuthService);

  getCurrentRole(): string {
    const role = this.authService.getCurrentUser()?.role?.toLowerCase().trim() || '';

    if (role === 'superviser') {
      return 'supervisor';
    }

    if (role === 'staff') {
      return 'user';
    }

    return role;
  }

  canManageInventory(): boolean {
    return ['admin', 'manager'].includes(this.getCurrentRole());
  }

  canUseAiWriteActions(): boolean {
    return this.canManageInventory();
  }
}
