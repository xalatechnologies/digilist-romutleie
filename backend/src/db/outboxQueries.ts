/**
 * Database Queries for Outbox and Accounting Exports
 */

import { query, queryOne } from './connection';
import { OutboxEvent, AccountingExport } from '../models/outbox';

/**
 * Create outbox event
 */
export async function createOutboxEvent(input: {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  payload: any;
}): Promise<OutboxEvent> {
  const sql = `
    INSERT INTO integration_outbox (
      id, event_type, entity_type, entity_id, payload,
      status, retry_count, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, 'PENDING', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING 
      id, event_type as "eventType", entity_type as "entityType",
      entity_id as "entityId", payload,
      status, retry_count as "retryCount", last_error as "lastError",
      next_retry_at as "nextRetryAt",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  const rows = await query<OutboxEvent>(sql, [
    input.id,
    input.eventType,
    input.entityType,
    input.entityId,
    JSON.stringify(input.payload),
  ]);

  return rows[0];
}

/**
 * Get pending outbox events ready for processing
 */
export async function getPendingOutboxEvents(limit: number = 10): Promise<OutboxEvent[]> {
  const sql = `
    SELECT 
      id, event_type as "eventType", entity_type as "entityType",
      entity_id as "entityId", payload,
      status, retry_count as "retryCount", last_error as "lastError",
      next_retry_at as "nextRetryAt",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM integration_outbox
    WHERE status = 'PENDING'
      AND (next_retry_at IS NULL OR next_retry_at <= CURRENT_TIMESTAMP)
    ORDER BY created_at ASC
    LIMIT $1
  `;

  const rows = await query<OutboxEvent>(sql, [limit]);
  
  // Parse JSONB payload
  return rows.map(row => ({
    ...row,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
  }));
}

/**
 * Update outbox event status
 */
export async function updateOutboxEventStatus(
  id: string,
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED',
  options?: {
    lastError?: string;
    nextRetryAt?: Date;
    incrementRetry?: boolean;
  }
): Promise<OutboxEvent> {
  const updates: string[] = [`status = $1`, `updated_at = CURRENT_TIMESTAMP`];
  const params: any[] = [status];
  let paramIndex = 2;

  if (options?.lastError !== undefined) {
    updates.push(`last_error = $${paramIndex++}`);
    params.push(options.lastError);
  }

  if (options?.nextRetryAt !== undefined) {
    updates.push(`next_retry_at = $${paramIndex++}`);
    params.push(options.nextRetryAt);
  } else if (status === 'PENDING' && options?.incrementRetry) {
    // Clear next_retry_at if setting to PENDING
    updates.push(`next_retry_at = NULL`);
  }

  if (options?.incrementRetry) {
    updates.push(`retry_count = retry_count + 1`);
  }

  params.push(id);

  const sql = `
    UPDATE integration_outbox
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING 
      id, event_type as "eventType", entity_type as "entityType",
      entity_id as "entityId", payload,
      status, retry_count as "retryCount", last_error as "lastError",
      next_retry_at as "nextRetryAt",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  const rows = await query<OutboxEvent>(sql, params);
  if (rows.length === 0) {
    throw new Error(`Outbox event ${id} not found`);
  }

  const row = rows[0];
  return {
    ...row,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
  };
}

/**
 * Get accounting export by invoice ID
 */
export async function getAccountingExportByInvoiceId(
  invoiceId: string,
  targetSystem: string = 'VISMA'
): Promise<AccountingExport | null> {
  const sql = `
    SELECT 
      id, invoice_id as "invoiceId", target_system as "targetSystem",
      status, external_ref as "externalRef", last_error as "lastError",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM accounting_exports
    WHERE invoice_id = $1 AND target_system = $2
  `;
  return await queryOne<AccountingExport>(sql, [invoiceId, targetSystem]);
}

/**
 * Create or update accounting export
 */
export async function upsertAccountingExport(input: {
  id: string;
  invoiceId: string;
  targetSystem?: string;
  status?: 'PENDING' | 'SENT' | 'FAILED' | 'CONFIRMED';
  externalRef?: string;
  lastError?: string;
}): Promise<AccountingExport> {
  const sql = `
    INSERT INTO accounting_exports (
      id, invoice_id, target_system, status, external_ref, last_error,
      created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (invoice_id, target_system) 
    DO UPDATE SET
      status = EXCLUDED.status,
      external_ref = EXCLUDED.external_ref,
      last_error = EXCLUDED.last_error,
      updated_at = CURRENT_TIMESTAMP
    RETURNING 
      id, invoice_id as "invoiceId", target_system as "targetSystem",
      status, external_ref as "externalRef", last_error as "lastError",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  const rows = await query<AccountingExport>(sql, [
    input.id,
    input.invoiceId,
    input.targetSystem || 'VISMA',
    input.status || 'PENDING',
    input.externalRef || null,
    input.lastError || null,
  ]);

  return rows[0];
}

/**
 * Update accounting export status
 */
export async function updateAccountingExportStatus(
  invoiceId: string,
  targetSystem: string,
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CONFIRMED',
  options?: {
    externalRef?: string;
    lastError?: string;
  }
): Promise<AccountingExport> {
  const updates: string[] = [`status = $1`, `updated_at = CURRENT_TIMESTAMP`];
  const params: any[] = [status];
  let paramIndex = 2;

  if (options?.externalRef !== undefined) {
    updates.push(`external_ref = $${paramIndex++}`);
    params.push(options.externalRef);
  }

  if (options?.lastError !== undefined) {
    updates.push(`last_error = $${paramIndex++}`);
    params.push(options.lastError);
  }

  params.push(invoiceId, targetSystem);

  const sql = `
    UPDATE accounting_exports
    SET ${updates.join(', ')}
    WHERE invoice_id = $${paramIndex} AND target_system = $${paramIndex + 1}
    RETURNING 
      id, invoice_id as "invoiceId", target_system as "targetSystem",
      status, external_ref as "externalRef", last_error as "lastError",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  const rows = await query<AccountingExport>(sql, params);
  if (rows.length === 0) {
    throw new Error(`Accounting export for invoice ${invoiceId} not found`);
  }
  return rows[0];
}

/**
 * Get accounting exports by invoice ID
 */
export async function getAccountingExportsByInvoiceId(invoiceId: string): Promise<AccountingExport[]> {
  const sql = `
    SELECT 
      id, invoice_id as "invoiceId", target_system as "targetSystem",
      status, external_ref as "externalRef", last_error as "lastError",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM accounting_exports
    WHERE invoice_id = $1
    ORDER BY created_at DESC
  `;
  return await query<AccountingExport>(sql, [invoiceId]);
}

