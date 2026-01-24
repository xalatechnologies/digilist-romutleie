/**
 * Backend AuditService
 * Writes audit logs to database
 */

import { Request } from 'express';
import { insertAuditLog } from '../db/queries';
import { AuditLog, AuditLogCreateInput } from '../models/auditLog';
import { getRequestContext } from '../middleware/requestContext';

export interface AuditEvent {
  action: string;
  entityType: string;
  entityId: string;
  message: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  metadata?: Record<string, any>;
  actorUserId?: string | null; // Override context userId
  actorRoles?: string[]; // Override context roles
}

export interface LogChangeParams {
  entityType: string;
  entityId: string;
  action: string;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * AuditService - Backend implementation
 * Writes to PostgreSQL database
 */
class AuditService {
  /**
   * Log an audit event
   * Automatically includes request context (orgId, requestId, etc.)
   * 
   * @param req - Express request (for context)
   * @param event - Audit event data
   * @returns Created audit log entry
   */
  async log(req: Request, event: AuditEvent): Promise<AuditLog> {
    const context = getRequestContext(req);

    const input: AuditLogCreateInput = {
      orgId: context.orgId,
      actorUserId: event.actorUserId !== undefined ? event.actorUserId : context.userId,
      actorRoles: event.actorRoles || context.roles,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      message: event.message,
      before: event.before || null,
      after: event.after || null,
      metadata: {
        ...(event.metadata || {}),
        requestId: context.requestId,
        orgId: context.orgId,
        correlationId: context.correlationId,
        userAgent: context.userAgent,
        ip: context.ip,
      },
    };

    return await insertAuditLog(input);
  }

  /**
   * Log a change event (before/after state)
   * Convenience method for tracking state changes
   * 
   * @param req - Express request
   * @param params - Change parameters
   * @returns Created audit log entry
   */
  async logChange(req: Request, params: LogChangeParams): Promise<AuditLog> {
    return await this.log(req, {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      message: params.message,
      before: params.before,
      after: params.after,
      metadata: params.metadata,
    });
  }
}

// Export singleton instance
export const auditService = new AuditService();

