/**
 * Room Model
 * TypeScript interfaces matching the database schema
 */

export interface Room {
  id: string;
  number: string;
  type: string; // SINGLE, DOUBLE, APARTMENT
  capacity: number;
  floor?: number;
  pricePerNight?: number;
  status: string; // CLEAN, DIRTY, OUT_OF_SERVICE
  outOfServiceReason?: string;
  outOfServiceNote?: string;
  expectedReturnDate?: Date;
  linkedTicketId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reservation {
  id: string;
  roomId: string;
  startDate: Date;
  endDate: Date;
  status: string; // DRAFT, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED
  guestCount: number;
  bookingGroupId?: string;
  checkInTime?: Date;
  checkOutTime?: Date;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum RoomStatus {
  CLEAN = 'CLEAN',
  DIRTY = 'DIRTY',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE'
}

export enum ReservationStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED'
}

export enum OccupancyState {
  FREE = 'FREE',
  RESERVED = 'RESERVED',
  OCCUPIED = 'OCCUPIED',
  DEPARTING = 'DEPARTING',
  BLOCKED = 'BLOCKED'
}

export enum NextEventType {
  ARRIVAL = 'ARRIVAL',
  CHECKOUT = 'CHECKOUT',
  FREE = 'FREE',
  BLOCKED = 'BLOCKED'
}

export interface OccupancyStateResult {
  state: OccupancyState;
  blocked: boolean;
  currentReservation?: Reservation;
  nextReservation?: Reservation;
}

export interface NextEventResult {
  nextEventType: NextEventType;
  nextEventAt?: Date;
  nextEventText: string;
}

