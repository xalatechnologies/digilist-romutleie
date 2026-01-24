/**
 * Database Queries for Housekeeping Tasks
 */

import { query, queryOne } from './connection';
import { HousekeepingTask, HousekeepingTaskCreateInput, HousekeepingTaskUpdateInput } from '../models/reservation';

/**
 * Create a housekeeping task
 */
export async function createHousekeepingTask(
  input: HousekeepingTaskCreateInput & { id: string }
): Promise<HousekeepingTask> {
  const sql = `
    INSERT INTO housekeeping_tasks (
      id, room_id, reservation_id, due_date, status, created_by, note,
      created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING 
      id, room_id as "roomId", reservation_id as "reservationId",
      due_date as "dueDate", status, created_by as "createdBy", note,
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  const rows = await query<HousekeepingTask>(sql, [
    input.id,
    input.roomId,
    input.reservationId || null,
    input.dueDate,
    'PENDING',
    input.createdBy || null,
    input.note || null,
  ]);

  return rows[0];
}

/**
 * Get housekeeping task by ID
 */
export async function getHousekeepingTaskById(id: string): Promise<HousekeepingTask | null> {
  const sql = `
    SELECT 
      id, room_id as "roomId", reservation_id as "reservationId",
      due_date as "dueDate", status, created_by as "createdBy", note,
      created_at as "createdAt", updated_at as "updatedAt"
    FROM housekeeping_tasks
    WHERE id = $1
  `;
  return await queryOne<HousekeepingTask>(sql, [id]);
}

/**
 * Get housekeeping task by reservation ID (for idempotency check)
 */
export async function getHousekeepingTaskByReservationId(
  reservationId: string
): Promise<HousekeepingTask | null> {
  const sql = `
    SELECT 
      id, room_id as "roomId", reservation_id as "reservationId",
      due_date as "dueDate", status, created_by as "createdBy", note,
      created_at as "createdAt", updated_at as "updatedAt"
    FROM housekeeping_tasks
    WHERE reservation_id = $1
  `;
  return await queryOne<HousekeepingTask>(sql, [reservationId]);
}

/**
 * Get housekeeping tasks with filters
 */
export async function getHousekeepingTasks(filters?: {
  date?: string;
  status?: string;
  roomId?: string;
}): Promise<HousekeepingTask[]> {
  let sql = `
    SELECT 
      id, room_id as "roomId", reservation_id as "reservationId",
      due_date as "dueDate", status, created_by as "createdBy", note,
      created_at as "createdAt", updated_at as "updatedAt"
    FROM housekeeping_tasks
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.date) {
    sql += ` AND due_date = $${paramIndex++}`;
    params.push(filters.date);
  }

  if (filters?.status) {
    sql += ` AND status = $${paramIndex++}`;
    params.push(filters.status);
  }

  if (filters?.roomId) {
    sql += ` AND room_id = $${paramIndex++}`;
    params.push(filters.roomId);
  }

  sql += ` ORDER BY due_date ASC, created_at ASC`;

  return await query<HousekeepingTask>(sql, params);
}

/**
 * Update housekeeping task
 */
export async function updateHousekeepingTask(
  id: string,
  input: HousekeepingTaskUpdateInput
): Promise<HousekeepingTask> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (input.status) {
    updates.push(`status = $${paramIndex++}`);
    params.push(input.status);
  }

  if (input.note !== undefined) {
    updates.push(`note = $${paramIndex++}`);
    params.push(input.note);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(id);

  const sql = `
    UPDATE housekeeping_tasks
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING 
      id, room_id as "roomId", reservation_id as "reservationId",
      due_date as "dueDate", status, created_by as "createdBy", note,
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  const rows = await query<HousekeepingTask>(sql, params);
  if (rows.length === 0) {
    throw new Error(`Housekeeping task ${id} not found`);
  }
  return rows[0];
}

