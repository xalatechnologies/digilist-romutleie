/**
 * Reservation Model
 * TypeScript interfaces for reservations and housekeeping tasks
 */

import { Reservation, ReservationStatus } from './room';

export interface ReservationCreateInput {
  roomId: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  status?: ReservationStatus;
  guestCount: number;
  bookingGroupId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface ReservationStatusUpdateInput {
  status: ReservationStatus;
  checkInTime?: string; // ISO timestamp
  checkOutTime?: string; // ISO timestamp
  cancellationReason?: string;
}

export interface HousekeepingTask {
  id: string;
  roomId: string;
  reservationId?: string;
  dueDate: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  createdBy?: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HousekeepingTaskCreateInput {
  roomId: string;
  reservationId?: string;
  dueDate: string; // ISO date string
  createdBy?: string;
  note?: string;
}

export interface HousekeepingTaskUpdateInput {
  status?: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  note?: string;
}

export { Reservation, ReservationStatus };

