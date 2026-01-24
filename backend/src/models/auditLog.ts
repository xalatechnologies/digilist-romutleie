/**
 * AuditLog Model
 * TypeScript interface matching the database schema
 */

export interface AuditLog {
  id: string; // UUID
  orgId: string;
  actorUserId: string | null;
  actorRoles: string[]; // JSON array in DB
  action: string;
  entityType: string;
  entityId: string;
  message: string;
  before: Record<string, any> | null; // JSON in DB
  after: Record<string, any> | null; // JSON in DB
  metadata: {
    requestId?: string;
    ip?: string;
    userAgent?: string;
    correlationId?: string;
    [key: string]: any;
  } | null; // JSON in DB
  createdAt: Date;
}

export interface AuditLogCreateInput {
  orgId: string;
  actorUserId: string | null;
  actorRoles: string[];
  action: string;
  entityType: string;
  entityId: string;
  message: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
}

export interface AuditLogQueryFilters {
  orgId?: string;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  action?: string;
  from?: Date;
  to?: Date;
  q?: string; // Search in message
  limit?: number;
  offset?: number;
}

