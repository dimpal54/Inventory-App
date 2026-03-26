import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';

export const adminRoleGuard = () => {
  const permissionService = inject(PermissionService);
  const router = inject(Router);

  if (permissionService.getCurrentRole() === 'admin') {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
