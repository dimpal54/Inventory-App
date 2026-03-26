import { Request, Response, NextFunction } from 'express';

export const normalizeRole = (role: unknown): string => {
  const value = typeof role === 'string' ? role.trim().toLowerCase() : '';

  if (value === 'superviser') {
    return 'supervisor';
  }

  if (value === 'staff') {
    return 'user';
  }

  return value;
};

export const canManageInventoryRole = (role: unknown): boolean =>
  ['admin', 'manager'].includes(normalizeRole(role));

export const allowRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const normalizedAllowedRoles = roles.map((role) => normalizeRole(role));

    if (
      !req.user ||
      !normalizedAllowedRoles.includes(normalizeRole(req.user.role as string))
    ) {
      res.status(403).json({
        success: false,
        message: 'Forbidden'
      });
      return;
    }

    next();
  };
};
