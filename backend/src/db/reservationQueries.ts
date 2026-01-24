/**
 * Database Queries for Reservations
 */

import { query, queryOne } from './connection';
import { Reservation } from '../models/room';
import { ReservationCreateInput, ReservationStatusUpdateInput } from '../models/reservation';

/**
 * Create a new reservation
 */
export async function createReservation(input: ReservationCreateInput & { id: string }): Promise<Reservation> {
  const sql = `
    INSERT INTO reservations (
      id, room_id, start_date, end_date, status, guest_count,
      booking_group_id, customer_name, customer_email, customer_phone,
      created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING 
      id, room_id as "roomId", start_date as "startDate", 
      end_date as "endDate", status, guest_count as "guestCount",
      booking_group_id as "bookingGroupId", check_in_time as "checkInTime",
      check_out_time as "checkOutTime", customer_name as "customerName",
      customer_email as "customerEmail", customer_phone as "customerPhone",
      created_at as "createdAt", updated_at as "updatedAt"
  `;
  
  const rows = await query<Reservation>(sql, [
    input.id,
    input.roomId,
    input.startDate,
    input.endDate,
    input.status || 'DRAFT',
    input.guestCount,
    input.bookingGroupId || null,
    input.customerName || null,
    input.customerEmail || null,
    input.customerPhone || null,
  ]);
  
  return rows[0];
}

/**
 * Get reservation by ID
 */
export async function getReservationById(id: string): Promise<Reservation | null> {
  const sql = `
    SELECT 
      id, room_id as "roomId", start_date as "startDate", 
      end_date as "endDate", status, guest_count as "guestCount",
      booking_group_id as "bookingGroupId", check_in_time as "checkInTime",
      check_out_time as "checkOutTime", customer_name as "customerName",
      customer_email as "customerEmail", customer_phone as "customerPhone",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM reservations
    WHERE id = $1
  `;
  return await queryOne<Reservation>(sql, [id]);
}

/**
 * Update reservation status
 */
export async function updateReservationStatus(
  id: string,
  input: ReservationStatusUpdateInput
): Promise<Reservation> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  updates.push(`status = $${paramIndex++}`);
  params.push(input.status);

  if (input.checkInTime) {
    updates.push(`check_in_time = $${paramIndex++}`);
    params.push(input.checkInTime);
  }

  if (input.checkOutTime) {
    updates.push(`check_out_time = $${paramIndex++}`);
    params.push(input.checkOutTime);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(id);

  const sql = `
    UPDATE reservations
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING 
      id, room_id as "roomId", start_date as "startDate", 
      end_date as "endDate", status, guest_count as "guestCount",
      booking_group_id as "bookingGroupId", check_in_time as "checkInTime",
      check_out_time as "checkOutTime", customer_name as "customerName",
      customer_email as "customerEmail", customer_phone as "customerPhone",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  const rows = await query<Reservation>(sql, params);
  if (rows.length === 0) {
    throw new Error(`Reservation ${id} not found`);
  }
  return rows[0];
}

