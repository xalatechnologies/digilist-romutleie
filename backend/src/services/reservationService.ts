/**
 * Reservation Service
 * Handles reservation lifecycle and side effects
 */

import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { availabilityService } from './availabilityService';
import { auditService } from './auditService';
import { createReservation, getReservationById, updateReservationStatus } from '../db/reservationQueries';
import { getHousekeepingTaskByReservationId, createHousekeepingTask } from '../db/housekeepingQueries';
import { query } from '../db/connection';
import { Reservation, ReservationStatus, RoomStatus } from '../models/room';
import { ReservationCreateInput, ReservationStatusUpdateInput } from '../models/reservation';
import { getRequestContext } from '../middleware/requestContext';

export class ReservationService {
  /**
   * Valid status transitions
   */
  private static readonly VALID_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
    DRAFT: [ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED],
    CONFIRMED: [ReservationStatus.CHECKED_IN, ReservationStatus.CANCELLED],
    CHECKED_IN: [ReservationStatus.CHECKED_OUT],
    CHECKED_OUT: [], // Terminal state
    CANCELLED: [], // Terminal state
  };

  /**
   * Check if a status transition is valid
   */
  static isValidTransition(from: ReservationStatus, to: ReservationStatus): boolean {
    return this.VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  /**
   * Create a new reservation
   */
  async createReservation(req: Request, input: ReservationCreateInput): Promise<Reservation> {
    const context = getRequestContext(req);

    // Validate availability
    await availabilityService.validateReservation(
      input.roomId,
      new Date(input.startDate),
      new Date(input.endDate)
    );

    // Create reservation
    const reservationId = randomUUID();
    const reservation = await createReservation({
      ...input,
      id: reservationId,
      status: input.status || ReservationStatus.DRAFT,
    });

    // Audit log
    await auditService.log(req, {
      action: 'RESERVATION_CREATED',
      entityType: 'RESERVATION',
      entityId: reservationId,
      message: `Reservation created for room ${input.roomId} (${input.startDate} to ${input.endDate})`,
      after: {
        status: reservation.status,
        roomId: input.roomId,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    });

    return reservation;
  }

  /**
   * Update reservation status with side effects
   */
  async updateReservationStatus(
    req: Request,
    reservationId: string,
    input: ReservationStatusUpdateInput
  ): Promise<Reservation> {
    const context = getRequestContext(req);

    // Get current reservation
    const current = await getReservationById(reservationId);
    if (!current) {
      throw new Error(`Reservation ${reservationId} not found`);
    }

    // Validate transition
    if (!ReservationService.isValidTransition(current.status as ReservationStatus, input.status)) {
      throw new Error(
        `Invalid status transition: ${current.status} → ${input.status}. ` +
        `Valid transitions from ${current.status}: ${ReservationService.VALID_TRANSITIONS[current.status as ReservationStatus]?.join(', ') || 'none'}`
      );
    }

    // Prepare update
    const updateInput: ReservationStatusUpdateInput = { ...input };
    
    if (input.status === ReservationStatus.CHECKED_IN && !input.checkInTime) {
      updateInput.checkInTime = new Date().toISOString();
    }

    if (input.status === ReservationStatus.CHECKED_OUT && !input.checkOutTime) {
      updateInput.checkOutTime = new Date().toISOString();
    }

    // Update reservation
    const updated = await updateReservationStatus(reservationId, updateInput);

    // Audit log
    await auditService.logChange(req, {
      entityType: 'RESERVATION',
      entityId: reservationId,
      action: 'RESERVATION_STATUS_CHANGED',
      before: {
        status: current.status,
        checkInTime: current.checkInTime,
        checkOutTime: current.checkOutTime,
      },
      after: {
        status: updated.status,
        checkInTime: updated.checkInTime,
        checkOutTime: updated.checkOutTime,
      },
      message: `Reservation status changed: ${current.status} → ${updated.status}`,
    });

    // Handle checkout side effects
    if (input.status === ReservationStatus.CHECKED_OUT) {
      await this.handleCheckout(req, updated);
    }

    return updated;
  }

  /**
   * Handle checkout side effects:
   * - Create housekeeping task (idempotent)
   * - Set room condition to DIRTY (unless OUT_OF_SERVICE)
   */
  private async handleCheckout(req: Request, reservation: Reservation): Promise<void> {
    const context = getRequestContext(req);

    // Check if housekeeping task already exists (idempotency)
    const existingTask = await getHousekeepingTaskByReservationId(reservation.id);
    
    if (!existingTask) {
      // Create housekeeping task
      const taskId = randomUUID();
      const dueDate = new Date(reservation.endDate);
      dueDate.setHours(0, 0, 0, 0);

      await createHousekeepingTask({
        id: taskId,
        roomId: reservation.roomId,
        reservationId: reservation.id,
        dueDate: dueDate.toISOString().split('T')[0],
        createdBy: context.userId || undefined,
        note: `Checkout task for reservation ${reservation.id}`,
      });

      // Audit log
      await auditService.log(req, {
        action: 'HOUSEKEEPING_TASK_CREATED',
        entityType: 'HOUSEKEEPING_TASK',
        entityId: taskId,
        message: `Housekeeping task created for room ${reservation.roomId} (checkout from reservation ${reservation.id})`,
        after: {
          roomId: reservation.roomId,
          reservationId: reservation.id,
          dueDate: dueDate.toISOString().split('T')[0],
        },
        metadata: {
          reservationId: reservation.id,
          triggeredBy: 'CHECKOUT',
        },
      });
    }

    // Update room condition to DIRTY (unless OUT_OF_SERVICE)
    const roomResult = await query<{ status: string }>(
      'SELECT status FROM rooms WHERE id = $1',
      [reservation.roomId]
    );

    if (roomResult.length === 0) {
      throw new Error(`Room ${reservation.roomId} not found`);
    }

    const roomStatus = roomResult[0].status;

    if (roomStatus !== RoomStatus.OUT_OF_SERVICE) {
      await query(
        'UPDATE rooms SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [RoomStatus.DIRTY, reservation.roomId]
      );

      // Audit log
      await auditService.logChange(req, {
        entityType: 'ROOM',
        entityId: reservation.roomId,
        action: 'ROOM_CONDITION_CHANGED',
        before: {
          status: roomStatus,
        },
        after: {
          status: RoomStatus.DIRTY,
        },
        message: `Room condition changed to DIRTY after checkout (reservation ${reservation.id})`,
        metadata: {
          reservationId: reservation.id,
          triggeredBy: 'CHECKOUT',
        },
      });
    }
  }
}

export const reservationService = new ReservationService();

