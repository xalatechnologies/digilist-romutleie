/**
 * Reservation API Service
 * Frontend service for reservation operations
 */

import { apiClient } from '../utils/apiClient';
import { BookingStatus } from '../types';

export interface ReservationCreateInput {
  roomId: string;
  startDate: string;
  endDate: string;
  status?: BookingStatus;
  guestCount: number;
  bookingGroupId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface ReservationStatusUpdateInput {
  status: BookingStatus;
  checkInTime?: string;
  checkOutTime?: string;
  cancellationReason?: string;
}

/**
 * Create a reservation
 */
export async function createReservation(input: ReservationCreateInput) {
  return await apiClient.post('/reservations', input);
}

/**
 * Update reservation status
 */
export async function updateReservationStatus(
  reservationId: string,
  input: ReservationStatusUpdateInput
) {
  return await apiClient.patch(`/reservations/${reservationId}/status`, input);
}

