/**
 * AuditService - Unified audit logging service
 * Provides structured audit logging with request context integration
 */

import { AuditAction, AuditEntityType, IAuditLog } from '../types';
import { getRequestContext } from '../contexts/RequestContext';

export interface AuditEvent {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  message: string;
  before?: any;
  after?: any;
  metadata?: Record<string, any>;
  actorUserId?: string | null;
  actorRoles?: string[];
}

export interface AuditChangeParams {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  before: any;
  after: any;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * AuditService - Centralized audit logging service
 * 
 * In a backend implementation, this would:
 * - Write to AuditLog database table
 * - Handle transaction rollback on errors
 * - Support bulk logging
 * - Provide query methods
 */
class AuditService {
  private logs: IAuditLog[] = [];
  private maxLogs = 10000; // In-memory limit (backend would use DB)

  /**
   * Log an audit event
   * Automatically includes request context (orgId, requestId, etc.)
   */
  log(event: AuditEvent): IAuditLog {
    const requestCtx = getRequestContext();
    
    const log: IAuditLog = {
      id: this.generateId(),
      orgId: requestCtx.orgId,
      actorUserId: event.actorUserId !== undefined ? event.actorUserId : requestCtx.userId,
      actorRoles: event.actorRoles || requestCtx.roles,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      message: event.message,
      before: event.before || null,
      after: event.after || null,
      metadata: {
        ...(event.metadata || {}),
        requestId: requestCtx.requestId,
        orgId: requestCtx.orgId,
        correlationId: requestCtx.correlationId,
        userAgent: requestCtx.userAgent,
        ip: requestCtx.ip
      },
      createdAt: new Date(),
      // Legacy fields for backward compatibility
      timestamp: new Date(),
      userId: event.actorUserId || requestCtx.userId || 'SYSTEM',
      domain: this.mapEntityTypeToDomain(event.entityType),
      details: event.message
    };

    // In backend: await db.auditLogs.insert(log);
    this.logs.unshift(log);
    
    // Maintain in-memory limit
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    return log;
  }

  /**
   * Log a change event (before/after state)
   * Convenience method for tracking state changes
   */
  logChange(params: AuditChangeParams): IAuditLog {
    return this.log({
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      message: params.message,
      before: params.before,
      after: params.after,
      metadata: params.metadata
    });
  }

  /**
   * Get audit logs with filters
   * In backend: would query database with indexes
   */
  getLogs(filters?: {
    entityType?: AuditEntityType;
    entityId?: string;
    action?: AuditAction;
    actorUserId?: string;
    orgId?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }): IAuditLog[] {
    let filtered = [...this.logs];

    if (filters?.entityType) {
      filtered = filtered.filter(l => l.entityType === filters.entityType);
    }

    if (filters?.entityId) {
      filtered = filtered.filter(l => l.entityId === filters.entityId);
    }

    if (filters?.action) {
      filtered = filtered.filter(l => l.action === filters.action);
    }

    if (filters?.actorUserId) {
      filtered = filtered.filter(l => l.actorUserId === filters.actorUserId);
    }

    if (filters?.orgId) {
      filtered = filtered.filter(l => l.orgId === filters.orgId);
    }

    if (filters?.from) {
      filtered = filtered.filter(l => l.createdAt >= filters.from!);
    }

    if (filters?.to) {
      filtered = filtered.filter(l => l.createdAt <= filters.to!);
    }

    const limit = filters?.limit || 1000;
    return filtered.slice(0, limit);
  }

  /**
   * Get logs for a specific entity
   * Uses index: (entityType, entityId, createdAt)
   */
  getLogsForEntity(entityType: AuditEntityType, entityId: string, limit: number = 50): IAuditLog[] {
    return this.getLogs({ entityType, entityId, limit });
  }

  /**
   * Get logs for a specific actor
   * Uses index: (actorUserId, createdAt)
   */
  getLogsForActor(actorUserId: string, limit: number = 100): IAuditLog[] {
    return this.getLogs({ actorUserId, limit });
  }

  /**
   * Get logs for an organization
   * Uses index: (orgId, createdAt)
   */
  getLogsForOrg(orgId: string, limit: number = 1000): IAuditLog[] {
    return this.getLogs({ orgId, limit });
  }

  /**
   * Clear all logs (for testing/reset)
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Get all logs (for migration/export)
   */
  getAllLogs(): IAuditLog[] {
    return [...this.logs];
  }

  // Private helpers

  private generateId(): string {
    return `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }

  private mapEntityTypeToDomain(entityType: AuditEntityType): IAuditLog['domain'] {
    switch (entityType) {
      case AuditEntityType.ROOM:
      case AuditEntityType.HOUSEKEEPING_TASK:
        return 'ROOM';
      case AuditEntityType.RESERVATION:
      case AuditEntityType.BOOKING_GROUP:
        return 'BOOKING';
      case AuditEntityType.MEAL_ORDER:
      case AuditEntityType.KITCHEN_ITEM:
        return 'KITCHEN';
      case AuditEntityType.INVOICE:
      case AuditEntityType.INVOICE_LINE:
      case AuditEntityType.PAYMENT:
        return 'BILLING';
      default:
        return 'SYSTEM';
    }
  }
}

// Export singleton instance
export const auditService = new AuditService();

