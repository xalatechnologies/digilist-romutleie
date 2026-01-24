/**
 * RBAC Middleware
 * Enforces role-based access control
 */

import { Request, Response, NextFunction } from 'express';
import { getRequestContext } from './requestContext';

export enum UserRole {
  ADMIN = 'ADMIN',
  BOOKING_STAFF = 'BOOKING_STAFF',
  HOUSEKEEPING = 'HOUSEKEEPING',
  KITCHEN = 'KITCHEN',
  FINANCE = 'FINANCE',
  MAINTENANCE = 'MAINTENANCE',
  VIEWER = 'VIEWER',
}

/**
 * Check if user has required role
 */
export function hasRole(req: Request, requiredRole: UserRole | UserRole[]): boolean {
  const context = getRequestContext(req);
  const roles = context.roles || [];
  
  // ADMIN has access to everything
  if (roles.includes(UserRole.ADMIN)) {
    return true;
  }

  const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return requiredRoles.some(role => roles.includes(role));
}

/**
 * Middleware to require specific role(s)
 */
export function requireRole(requiredRole: UserRole | UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!hasRole(req, requiredRole)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of the following roles: ${Array.isArray(requiredRole) ? requiredRole.join(', ') : requiredRole}`,
      });
      return;
    }
    next();
  };
}

