/**
 * Backend AvailabilityService
 * Single source of truth for room availability and occupancy state
 */

import { query, queryOne } from '../db/connection';
import { Room, Reservation, RoomStatus, ReservationStatus, OccupancyState, NextEventType, OccupancyStateResult, NextEventResult } from '../models/room';

export class AvailabilityService {
  /**
   * Get room occupancy state for a date range
   * Returns FREE, RESERVED, OCCUPIED, DEPARTING, or BLOCKED
   */
  async getRoomOccupancyState(
    roomId: string,
    from: Date,
    to: Date
  ): Promise<OccupancyStateResult> {
    // First check if room is OUT_OF_SERVICE
    const room = await queryOne<Room>(
      `SELECT id, status, out_of_service_reason 
       FROM rooms 
       WHERE id = $1`,
      [roomId]
    );

    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    if (room.status === RoomStatus.OUT_OF_SERVICE) {
      return {
        state: OccupancyState.BLOCKED,
        blocked: true,
      };
    }

    // Get active reservations for this room in the date range
    const reservations = await query<Reservation>(
      `SELECT id, room_id as "roomId", start_date as "startDate", 
              end_date as "endDate", status, guest_count as "guestCount",
              booking_group_id as "bookingGroupId", check_in_time as "checkInTime",
              check_out_time as "checkOutTime", customer_name as "customerName",
              customer_email as "customerEmail", customer_phone as "customerPhone",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM reservations
       WHERE room_id = $1
         AND status NOT IN ($2, $3)
         AND start_date < $5
         AND end_date > $4
       ORDER BY start_date ASC`,
      [roomId, ReservationStatus.CANCELLED, ReservationStatus.CHECKED_OUT, from, to]
    );

    // Find current reservation (overlapping with 'from' date)
    const currentReservation = reservations.find(r => {
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      return from >= start && from < end;
    });

    // Find next reservation (starts after 'from' date)
    const nextReservation = reservations
      .filter(r => {
        const start = new Date(r.startDate);
        return start > from;
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

    // Determine occupancy state
    let state: OccupancyState = OccupancyState.FREE;

    if (currentReservation) {
      if (currentReservation.status === ReservationStatus.CHECKED_IN) {
        // Check if departing today
        const checkoutDate = new Date(currentReservation.endDate);
        checkoutDate.setHours(0, 0, 0, 0);
        const today = new Date(from);
        today.setHours(0, 0, 0, 0);

        if (checkoutDate.getTime() === today.getTime()) {
          state = OccupancyState.DEPARTING;
        } else {
          state = OccupancyState.OCCUPIED;
        }
      } else if (currentReservation.status === ReservationStatus.CONFIRMED || 
                 currentReservation.status === ReservationStatus.DRAFT) {
        state = OccupancyState.RESERVED;
      }
    }

    return {
      state,
      blocked: false,
      currentReservation,
      nextReservation,
    };
  }

  /**
   * Get next event for a room
   */
  async getRoomNextEvent(
    roomId: string,
    from: Date,
    to: Date
  ): Promise<NextEventResult> {
    // Check if room is blocked
    const room = await queryOne<Room>(
      `SELECT id, status FROM rooms WHERE id = $1`,
      [roomId]
    );

    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    if (room.status === RoomStatus.OUT_OF_SERVICE) {
      return {
        nextEventType: NextEventType.BLOCKED,
        nextEventText: `Blocked: ${room.outOfServiceReason || 'Out of service'}`,
      };
    }

    // Get next arrival
    const nextArrival = await queryOne<Reservation>(
      `SELECT id, room_id as "roomId", start_date as "startDate", 
              end_date as "endDate", status, guest_count as "guestCount",
              booking_group_id as "bookingGroupId", check_in_time as "checkInTime",
              check_out_time as "checkOutTime", customer_name as "customerName",
              customer_email as "customerEmail", customer_phone as "customerPhone",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM reservations
       WHERE room_id = $1
         AND status IN ($2, $3)
         AND start_date >= $4
         AND start_date <= $5
       ORDER BY start_date ASC
       LIMIT 1`,
      [roomId, ReservationStatus.CONFIRMED, ReservationStatus.DRAFT, from, to]
    );

    // Get next checkout (for currently checked-in reservations)
    const nextCheckout = await queryOne<Reservation>(
      `SELECT id, room_id as "roomId", start_date as "startDate", 
              end_date as "endDate", status, guest_count as "guestCount",
              booking_group_id as "bookingGroupId", check_in_time as "checkInTime",
              check_out_time as "checkOutTime", customer_name as "customerName",
              customer_email as "customerEmail", customer_phone as "customerPhone",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM reservations
       WHERE room_id = $1
         AND status = $2
         AND end_date >= $3
         AND end_date <= $4
       ORDER BY end_date ASC
       LIMIT 1`,
      [roomId, ReservationStatus.CHECKED_IN, from, to]
    );

    // Determine next event
    if (nextCheckout) {
      const checkoutDate = new Date(nextCheckout.endDate);
      const daysUntilCheckout = Math.ceil((checkoutDate.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilCheckout === 0) {
        return {
          nextEventType: NextEventType.CHECKOUT,
          nextEventAt: checkoutDate,
          nextEventText: `Departing today (${nextCheckout.checkOutTime || '11:00'})`,
        };
      } else {
        return {
          nextEventType: NextEventType.CHECKOUT,
          nextEventAt: checkoutDate,
          nextEventText: `Checkout in ${daysUntilCheckout} day(s)`,
        };
      }
    }

    if (nextArrival) {
      const arrivalDate = new Date(nextArrival.startDate);
      const daysUntilArrival = Math.ceil((arrivalDate.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilArrival === 0) {
        return {
          nextEventType: NextEventType.ARRIVAL,
          nextEventAt: arrivalDate,
          nextEventText: `Arrival today (${nextArrival.checkInTime || '15:00'})`,
        };
      } else {
        return {
          nextEventType: NextEventType.ARRIVAL,
          nextEventAt: arrivalDate,
          nextEventText: `Arrival in ${daysUntilArrival} day(s)`,
        };
      }
    }

    return {
      nextEventType: NextEventType.FREE,
      nextEventText: 'No upcoming events',
    };
  }

  /**
   * Validate if a reservation can be created for a room
   * Throws error if room is OUT_OF_SERVICE or overlaps with existing reservations
   */
  async validateReservation(
    roomId: string,
    start: Date,
    end: Date,
    excludeReservationId?: string
  ): Promise<void> {
    // Check room status
    const room = await queryOne<Room>(
      `SELECT id, status FROM rooms WHERE id = $1`,
      [roomId]
    );

    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    if (room.status === RoomStatus.OUT_OF_SERVICE) {
      throw new Error(`Room ${room.number} is out of service and cannot be reserved`);
    }

    // Check for overlapping reservations
    const overlapping = await query<Reservation>(
      `SELECT id, start_date as "startDate", end_date as "endDate", status
       FROM reservations
       WHERE room_id = $1
         AND status NOT IN ($2, $3)
         AND start_date < $5
         AND end_date > $4
         ${excludeReservationId ? 'AND id != $6' : ''}`,
      excludeReservationId
        ? [roomId, ReservationStatus.CANCELLED, ReservationStatus.CHECKED_OUT, start, end, excludeReservationId]
        : [roomId, ReservationStatus.CANCELLED, ReservationStatus.CHECKED_OUT, start, end]
    );

    if (overlapping.length > 0) {
      const conflict = overlapping[0];
      throw new Error(
        `Room ${room.number} is unavailable. Conflicting reservation: ${new Date(conflict.startDate).toISOString().split('T')[0]} to ${new Date(conflict.endDate).toISOString().split('T')[0]}`
      );
    }
  }
}

// Export singleton instance
export const availabilityService = new AvailabilityService();

