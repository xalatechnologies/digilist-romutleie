/**
 * AvailabilityService - Single source of truth for room availability
 * Provides centralized availability checking, overlap detection, and occupancy state
 */

import { IRoom, IBooking, RoomStatus, BookingStatus, RoomOccupancy } from '../types';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface OccupancyState {
  state: RoomOccupancy;
  currentBooking?: IBooking;
  nextBooking?: IBooking;
  conflictingBookings?: IBooking[];
}

/**
 * AvailabilityService - Centralized availability engine
 * 
 * In a backend implementation, this would:
 * - Query database with optimized indexes
 * - Cache availability results
 * - Support bulk availability checks
 * - Handle timezone conversions
 */
class AvailabilityService {
  /**
   * Check if a date range overlaps with existing bookings for a room
   * Returns true if there is an overlap
   */
  checkOverlap(
    roomId: string,
    start: Date | string,
    end: Date | string,
    bookings: IBooking[],
    excludeBookingId?: string
  ): boolean {
    const startDate = typeof start === 'string' ? new Date(start) : start;
    const endDate = typeof end === 'string' ? new Date(end) : end;

    // Normalize dates to start of day for comparison
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    return bookings.some(booking => {
      // Skip if excluded booking
      if (excludeBookingId && booking.id === excludeBookingId) {
        return false;
      }

      // Skip if not for this room
      if (booking.roomId !== roomId) {
        return false;
      }

      // Skip cancelled and checked-out bookings
      if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.CHECKED_OUT) {
        return false;
      }

      const bookingStart = new Date(booking.startDate);
      const bookingEnd = new Date(booking.endDate);
      bookingStart.setHours(0, 0, 0, 0);
      bookingEnd.setHours(0, 0, 0, 0);

      // Check for overlap: newStart < bookingEnd && newEnd > bookingStart
      // This handles all overlap cases including:
      // - New booking starts before and ends during existing booking
      // - New booking starts during and ends after existing booking
      // - New booking completely contains existing booking
      // - New booking is completely contained by existing booking
      return startDate < bookingEnd && endDate > bookingStart;
    });
  }

  /**
   * Get room occupancy state for a specific date or date range
   * Returns FREE, RESERVED, OCCUPIED, or DEPARTING
   */
  getRoomOccupancyState(
    roomId: string,
    dateRange: DateRange | Date | string,
    room: IRoom,
    bookings: IBooking[]
  ): OccupancyState {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let targetDate: Date;
    let endDate: Date | null = null;

    if (dateRange instanceof Date) {
      targetDate = new Date(dateRange);
      targetDate.setHours(0, 0, 0, 0);
    } else if (typeof dateRange === 'string') {
      targetDate = new Date(dateRange);
      targetDate.setHours(0, 0, 0, 0);
    } else {
      targetDate = new Date(dateRange.start);
      targetDate.setHours(0, 0, 0, 0);
      endDate = new Date(dateRange.end);
      endDate.setHours(0, 0, 0, 0);
    }

    // Filter relevant bookings for this room
    const relevantBookings = bookings.filter(b => {
      if (b.roomId !== roomId) return false;
      if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.CHECKED_OUT) return false;

      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      bStart.setHours(0, 0, 0, 0);
      bEnd.setHours(0, 0, 0, 0);

      // Check if booking overlaps with target date/range
      if (endDate) {
        return targetDate <= bEnd && endDate >= bStart;
      } else {
        return targetDate >= bStart && targetDate < bEnd;
      }
    });

    // Find current/active booking
    const currentBooking = relevantBookings.find(b => {
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      bStart.setHours(0, 0, 0, 0);
      bEnd.setHours(0, 0, 0, 0);

      if (endDate) {
        // For date range, check if booking is active during any part of range
        return targetDate < bEnd && endDate > bStart;
      } else {
        // For single date, check if booking is active on that date
        return targetDate >= bStart && targetDate < bEnd;
      }
    });

    // Determine occupancy state
    let state: RoomOccupancy = RoomOccupancy.FREE;
    let nextBooking: IBooking | undefined;

    if (currentBooking) {
      const bookingStart = new Date(currentBooking.startDate);
      const bookingEnd = new Date(currentBooking.endDate);
      bookingStart.setHours(0, 0, 0, 0);
      bookingEnd.setHours(0, 0, 0, 0);

      if (currentBooking.status === BookingStatus.CHECKED_IN) {
        // Currently occupied
        if (targetDate.getTime() === bookingEnd.getTime() - 86400000) {
          // Check if departing today (checkout date)
          state = RoomOccupancy.DEPARTING;
        } else {
          state = RoomOccupancy.OCCUPIED;
        }
      } else if (currentBooking.status === BookingStatus.CONFIRMED || currentBooking.status === BookingStatus.DRAFT) {
        // Reserved but not yet checked in
        state = RoomOccupancy.RESERVED;
      } else if (currentBooking.status === BookingStatus.CHECKED_IN) {
        state = RoomOccupancy.OCCUPIED;
      }
    }

    // Find next booking (for display purposes)
    const futureBookings = bookings
      .filter(b => {
        if (b.roomId !== roomId) return false;
        if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.CHECKED_OUT) return false;
        const bStart = new Date(b.startDate);
        bStart.setHours(0, 0, 0, 0);
        return bStart > targetDate;
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    if (futureBookings.length > 0) {
      nextBooking = futureBookings[0];
    }

    return {
      state,
      currentBooking,
      nextBooking,
      conflictingBookings: relevantBookings.filter(b => b.id !== currentBooking?.id)
    };
  }

  /**
   * Check if a room is bookable for a given date range
   * Returns false if:
   * - Room is OUT_OF_SERVICE
   * - Date range overlaps with existing active bookings
   */
  isBookable(
    roomId: string,
    start: Date | string,
    end: Date | string,
    room: IRoom,
    bookings: IBooking[],
    excludeBookingId?: string
  ): boolean {
    // Block if room is out of service
    if (room.status === RoomStatus.OUT_OF_SERVICE) {
      return false;
    }

    // Check for overlaps
    const hasOverlap = this.checkOverlap(roomId, start, end, bookings, excludeBookingId);
    if (hasOverlap) {
      return false;
    }

    // Validate date range
    const startDate = typeof start === 'string' ? new Date(start) : start;
    const endDate = typeof end === 'string' ? new Date(end) : end;

    if (startDate >= endDate) {
      return false;
    }

    return true;
  }

  /**
   * Get all bookable rooms for a date range
   * Returns array of room IDs that are available
   */
  getAvailableRooms(
    start: Date | string,
    end: Date | string,
    rooms: IRoom[],
    bookings: IBooking[]
  ): IRoom[] {
    return rooms.filter(room => 
      this.isBookable(room.id, start, end, room, bookings)
    );
  }

  /**
   * Get conflicting bookings for a date range
   * Useful for showing why a room is not available
   */
  getConflictingBookings(
    roomId: string,
    start: Date | string,
    end: Date | string,
    bookings: IBooking[],
    excludeBookingId?: string
  ): IBooking[] {
    const startDate = typeof start === 'string' ? new Date(start) : start;
    const endDate = typeof end === 'string' ? new Date(end) : end;
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    return bookings.filter(booking => {
      if (excludeBookingId && booking.id === excludeBookingId) {
        return false;
      }

      if (booking.roomId !== roomId) {
        return false;
      }

      if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.CHECKED_OUT) {
        return false;
      }

      const bookingStart = new Date(booking.startDate);
      const bookingEnd = new Date(booking.endDate);
      bookingStart.setHours(0, 0, 0, 0);
      bookingEnd.setHours(0, 0, 0, 0);

      return startDate < bookingEnd && endDate > bookingStart;
    });
  }
}

// Export singleton instance
export const availabilityService = new AvailabilityService();

