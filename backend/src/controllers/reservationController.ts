/**
 * Reservation Controller
 * Handles reservation lifecycle endpoints
 */

import { Request, Response } from 'express';
import { reservationService } from '../services/reservationService';
import { ReservationCreateInput, ReservationStatusUpdateInput } from '../models/reservation';
import { requireRole, UserRole } from '../middleware/rbac';

/**
 * POST /reservations
 * Create a new reservation
 * Required role: BOOKING_STAFF or ADMIN
 */
export async function createReservation(req: Request, res: Response): Promise<void> {
  try {
    const input: ReservationCreateInput = req.body;

    // Validate required fields
    if (!input.roomId || !input.startDate || !input.endDate || !input.guestCount) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'roomId, startDate, endDate, and guestCount are required',
      });
      return;
    }

    const reservation = await reservationService.createReservation(req, input);

    res.status(201).json(reservation);
  } catch (error: any) {
    console.error('Error creating reservation:', error);
    res.status(400).json({
      error: 'Failed to create reservation',
      message: error.message,
    });
  }
}

/**
 * PATCH /reservations/:id/status
 * Update reservation status
 * Required role: BOOKING_STAFF or ADMIN
 */
export async function updateReservationStatus(req: Request, res: Response): Promise<void> {
  try {
    const reservationId = req.params.id;
    const input: ReservationStatusUpdateInput = req.body;

    if (!input.status) {
      res.status(400).json({
        error: 'Missing required field',
        message: 'status is required',
      });
      return;
    }

    const reservation = await reservationService.updateReservationStatus(req, reservationId, input);

    res.json(reservation);
  } catch (error: any) {
    console.error('Error updating reservation status:', error);
    const statusCode = error.message.includes('not found') ? 404 : 
                      error.message.includes('Invalid status transition') ? 400 : 500;
    res.status(statusCode).json({
      error: 'Failed to update reservation status',
      message: error.message,
    });
  }
}

// Export middleware for route protection
export const requireBookingStaff = requireRole([UserRole.BOOKING_STAFF, UserRole.ADMIN]);

