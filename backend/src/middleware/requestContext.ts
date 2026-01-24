/**
 * Request Context Middleware
 * Captures request-scoped information for audit logging
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestContext {
  requestId: string;
  orgId: string;
  userId: string | null;
  roles: string[];
  ip: string | undefined;
  userAgent: string | undefined;
  correlationId?: string;
}

// Extend Express Request to include context
declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}

/**
 * Middleware to create and attach request context
 * Must run early in the middleware chain
 */
export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Get or generate request ID
  const requestId = req.headers['x-request-id'] as string || uuidv4();

  // Get orgId (default for single-tenant)
  const orgId = req.headers['x-org-id'] as string || process.env.DEFAULT_ORG_ID || 'default-org';

  // Get userId and roles from auth (will be set by auth middleware if present)
  // For now, we'll extract from JWT or use defaults
  const userId = (req as any).user?.id || (req as any).user?.userId || null;
  const roles = (req as any).user?.roles || [];

  // Get IP address
  const ip = req.ip || req.socket.remoteAddress || undefined;

  // Get user agent
  const userAgent = req.headers['user-agent'];

  // Get correlation ID if present
  const correlationId = req.headers['x-correlation-id'] as string || undefined;

  // Attach context to request
  req.context = {
    requestId,
    orgId,
    userId,
    roles,
    ip,
    userAgent,
    correlationId,
  };

  // Add request ID to response headers for tracing
  res.setHeader('X-Request-ID', requestId);

  next();
}

/**
 * Helper to get request context from request object
 * Use this in controllers/services
 */
export function getRequestContext(req: Request): RequestContext {
  if (!req.context) {
    throw new Error('Request context not initialized. Ensure requestContextMiddleware is applied.');
  }
  return req.context;
}

