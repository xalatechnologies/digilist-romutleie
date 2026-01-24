/**
 * Database Queries for Rooms and Reservations
 */

import { query, queryOne } from './connection';
import { Room, Reservation } from '../models/room';

/**
 * Get all rooms
 */
export async function getAllRooms(): Promise<Room[]> {
  const sql = `
    SELECT 
      id, number, type, capacity, floor, price_per_night as "pricePerNight",
      status, out_of_service_reason as "outOfServiceReason",
      out_of_service_note as "outOfServiceNote",
      expected_return_date as "expectedReturnDate",
      linked_ticket_id as "linkedTicketId",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM rooms
    ORDER BY number ASC
  `;
  return await query<Room>(sql);
}

/**
 * Get room by ID
 */
export async function getRoomById(id: string): Promise<Room | null> {
  const sql = `
    SELECT 
      id, number, type, capacity, floor, price_per_night as "pricePerNight",
      status, out_of_service_reason as "outOfServiceReason",
      out_of_service_note as "outOfServiceNote",
      expected_return_date as "expectedReturnDate",
      linked_ticket_id as "linkedTicketId",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM rooms
    WHERE id = $1
  `;
  return await queryOne<Room>(sql, [id]);
}

/**
 * Get reservations for a room in date range
 */
export async function getRoomReservations(
  roomId: string,
  from: Date,
  to: Date
): Promise<Reservation[]> {
  const sql = `
    SELECT 
      id, room_id as "roomId", start_date as "startDate", 
      end_date as "endDate", status, guest_count as "guestCount",
      booking_group_id as "bookingGroupId", check_in_time as "checkInTime",
      check_out_time as "checkOutTime", customer_name as "customerName",
      customer_email as "customerEmail", customer_phone as "customerPhone",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM reservations
    WHERE room_id = $1
      AND start_date < $3
      AND end_date > $2
    ORDER BY start_date ASC
  `;
  return await query<Reservation>(sql, [roomId, from, to]);
}

/**
 * Get all reservations in date range (for outlook)
 */
export async function getReservationsInRange(
  from: Date,
  to: Date
): Promise<Reservation[]> {
  const sql = `
    SELECT 
      id, room_id as "roomId", start_date as "startDate", 
      end_date as "endDate", status, guest_count as "guestCount",
      booking_group_id as "bookingGroupId", check_in_time as "checkInTime",
      check_out_time as "checkOutTime", customer_name as "customerName",
      customer_email as "customerEmail", customer_phone as "customerPhone",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM reservations
    WHERE start_date < $2
      AND end_date > $1
      AND status NOT IN ('CANCELLED', 'CHECKED_OUT')
    ORDER BY start_date ASC
  `;
  return await query<Reservation>(sql, [from, to]);
}

