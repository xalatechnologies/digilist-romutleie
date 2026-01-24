/**
 * Audit Controller
 * Handles audit log query endpoints
 */

import { Request, Response } from 'express';
import { queryAuditLogs } from '../db/queries';
import { AuditLogQueryFilters } from '../models/auditLog';

/**
 * GET /audit
 * Query audit logs with filters
 * 
 * Query parameters:
 * - entityType: Filter by entity type
 * - entityId: Filter by entity ID
 * - actorUserId: Filter by actor user ID
 * - action: Filter by action
 * - from: Start date (ISO string)
 * - to: End date (ISO string)
 * - q: Search in message
 * - limit: Results per page (default: 50)
 * - offset: Pagination offset (default: 0)
 */
export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const filters: AuditLogQueryFilters = {};

    if (req.query.entityType) {
      filters.entityType = req.query.entityType as string;
    }

    if (req.query.entityId) {
      filters.entityId = req.query.entityId as string;
    }

    if (req.query.actorUserId) {
      filters.actorUserId = req.query.actorUserId as string;
    }

    if (req.query.action) {
      filters.action = req.query.action as string;
    }

    if (req.query.from) {
      filters.from = new Date(req.query.from as string);
    }

    if (req.query.to) {
      filters.to = new Date(req.query.to as string);
    }

    if (req.query.q) {
      filters.q = req.query.q as string;
    }

    if (req.query.limit) {
      filters.limit = parseInt(req.query.limit as string, 10);
    }

    if (req.query.offset) {
      filters.offset = parseInt(req.query.offset as string, 10);
    }

    const result = await queryAuditLogs(filters);

    res.json({
      logs: result.logs,
      total: result.total,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    });
  } catch (error: any) {
    console.error('Error querying audit logs:', error);
    res.status(500).json({
      error: 'Failed to query audit logs',
      message: error.message,
    });
  }
}

