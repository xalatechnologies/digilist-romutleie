/**
 * Authentication Middleware
 * Extracts user info from JWT token (stub implementation)
 * 
 * In production, this would:
 * - Verify JWT signature
 * - Extract userId and roles from token
 * - Attach to req.user
 */

import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        userId: string;
        roles: string[];
      };
    }
  }
}

/**
 * Stub authentication middleware
 * For demo purposes, accepts:
 * - Authorization: Bearer <token> header
 * - x-user-id header (for testing)
 * - x-user-roles header (comma-separated, for testing)
 * 
 * In production, replace with proper JWT verification
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // For demo/testing: allow x-user-id header
  const testUserId = req.headers['x-user-id'] as string;
  const testRoles = req.headers['x-user-roles'] as string;

  if (testUserId) {
    // Test mode: use headers
    req.user = {
      id: testUserId,
      userId: testUserId,
      roles: testRoles ? testRoles.split(',').map(r => r.trim()) : ['USER'],
    };
    return next();
  }

  // Production: verify JWT
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No auth required for some endpoints (public)
    // For protected endpoints, return 401
    // For now, allow unauthenticated requests (will be null in context)
    return next();
  }

  const token = authHeader.substring(7);

  // TODO: Verify JWT token
  // const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // req.user = {
  //   id: decoded.sub,
  //   userId: decoded.sub,
  //   roles: decoded.roles || [],
  // };

  // For demo, allow unauthenticated
  next();
}

/**
 * Optional: Require authentication
 * Use this middleware on protected routes
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

