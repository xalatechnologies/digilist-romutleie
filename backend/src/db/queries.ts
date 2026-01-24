/**
 * Database Queries for AuditLog
 */

import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from './connection';
import { AuditLog, AuditLogCreateInput, AuditLogQueryFilters } from '../models/auditLog';

/**
 * Insert a new audit log entry
 */
export async function insertAuditLog(input: AuditLogCreateInput): Promise<AuditLog> {
  const id = uuidv4();
  
  const sql = `
    INSERT INTO audit_logs (
      id, org_id, actor_user_id, actor_roles, action,
      entity_type, entity_id, message, before_state, after_state, metadata, created_at
    ) VALUES (
      $1, $2, $3, $4::jsonb, $5,
      $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, NOW()
    )
    RETURNING 
      id, org_id as "orgId", actor_user_id as "actorUserId",
      actor_roles::text[] as "actorRoles", action,
      entity_type as "entityType", entity_id as "entityId", message,
      before_state as "before", after_state as "after",
      metadata, created_at as "createdAt"
  `;

  const params = [
    id,
    input.orgId,
    input.actorUserId,
    JSON.stringify(input.actorRoles),
    input.action,
    input.entityType,
    input.entityId,
    input.message,
    input.before ? JSON.stringify(input.before) : null,
    input.after ? JSON.stringify(input.after) : null,
    input.metadata ? JSON.stringify(input.metadata) : null,
  ];

  const result = await queryOne<AuditLog>(sql, params);
  if (!result) {
    throw new Error('Failed to insert audit log');
  }

  // Parse JSON fields
  return {
    ...result,
    before: result.before ? (typeof result.before === 'string' ? JSON.parse(result.before) : result.before) : null,
    after: result.after ? (typeof result.after === 'string' ? JSON.parse(result.after) : result.after) : null,
    metadata: result.metadata ? (typeof result.metadata === 'string' ? JSON.parse(result.metadata) : result.metadata) : null,
  };
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(filters: AuditLogQueryFilters): Promise<{
  logs: AuditLog[];
  total: number;
}> {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  // Build WHERE clause
  if (filters.orgId) {
    conditions.push(`org_id = $${paramIndex++}`);
    params.push(filters.orgId);
  }

  if (filters.entityType) {
    conditions.push(`entity_type = $${paramIndex++}`);
    params.push(filters.entityType);
  }

  if (filters.entityId) {
    conditions.push(`entity_id = $${paramIndex++}`);
    params.push(filters.entityId);
  }

  if (filters.actorUserId) {
    conditions.push(`actor_user_id = $${paramIndex++}`);
    params.push(filters.actorUserId);
  }

  if (filters.action) {
    conditions.push(`action = $${paramIndex++}`);
    params.push(filters.action);
  }

  if (filters.from) {
    conditions.push(`created_at >= $${paramIndex++}`);
    params.push(filters.from);
  }

  if (filters.to) {
    conditions.push(`created_at <= $${paramIndex++}`);
    params.push(filters.to);
  }

  if (filters.q) {
    conditions.push(`message ILIKE $${paramIndex++}`);
    params.push(`%${filters.q}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total
  const countSql = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`;
  const countResult = await queryOne<{ total: string }>(countSql, params);
  const total = parseInt(countResult?.total || '0', 10);

  // Get paginated results
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const sql = `
    SELECT 
      id, org_id as "orgId", actor_user_id as "actorUserId",
      actor_roles::text[] as "actorRoles", action,
      entity_type as "entityType", entity_id as "entityId", message,
      before_state as "before", after_state as "after",
      metadata, created_at as "createdAt"
    FROM audit_logs
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  params.push(limit, offset);

  const rows = await query<AuditLog>(sql, params);

  // Parse JSON fields
  const logs = rows.map(row => ({
    ...row,
    before: row.before ? (typeof row.before === 'string' ? JSON.parse(row.before) : row.before) : null,
    after: row.after ? (typeof row.after === 'string' ? JSON.parse(row.after) : row.after) : null,
    metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : null,
  }));

  return { logs, total };
}

