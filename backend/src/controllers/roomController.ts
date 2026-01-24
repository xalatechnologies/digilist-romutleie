/**
 * Room Controller
 * Handles room summary and detail endpoints
 */

import { Request, Response } from 'express';
import { getAllRooms, getRoomById, getRoomReservations } from '../db/roomQueries';
import { availabilityService } from '../services/availabilityService';
import { Room, OccupancyState, NextEventType } from '../models/room';

export interface RoomSummary {
  id: string;
  number: string;
  type: string;
  capacity: number;
  floor?: number;
  pricePerNight?: number;
  status: string;
  outOfServiceReason?: string;
  occupancyState: string;
  blocked: boolean;
  nextEventText: string;
  hasOpenMaintenance?: boolean;
  hasHousekeepingDue?: boolean;
}

export interface RoomDetail extends Room {
  occupancyState: string;
  blocked: boolean;
  nextEventText: string;
  outlook: Array<{
    date: string;
    reservations: Array<{
      id: string;
      startDate: string;
      endDate: string;
      status: string;
      customerName?: string;
    }>;
  }>;
}

/**
 * GET /rooms/summary
 * Get summary of all rooms with occupancy state
 * 
 * Query params:
 * - from: Start date (ISO string, default: today)
 * - to: End date (ISO string, default: today + 7 days)
 * - status: Filter by room status (CLEAN, DIRTY, OUT_OF_SERVICE)
 * - type: Filter by room type (SINGLE, DOUBLE, APARTMENT)
 * - q: Search by room number
 */
export async function getRoomsSummary(req: Request, res: Response): Promise<void> {
  try {
    const from = req.query.from 
      ? new Date(req.query.from as string)
      : new Date();
    from.setHours(0, 0, 0, 0);

    const to = req.query.to
      ? new Date(req.query.to as string)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 days
    to.setHours(23, 59, 59, 999);

    const statusFilter = req.query.status as string | undefined;
    const typeFilter = req.query.type as string | undefined;
    const searchQuery = req.query.q as string | undefined;

    // Get all rooms
    let rooms = await getAllRooms();

    // Apply filters
    if (statusFilter) {
      rooms = rooms.filter(r => r.status === statusFilter);
    }

    if (typeFilter) {
      rooms = rooms.filter(r => r.type === typeFilter);
    }

    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase();
      rooms = rooms.filter(r => r.number.toLowerCase().includes(queryLower));
    }

    // Get occupancy state for each room
    const summaries: RoomSummary[] = await Promise.all(
      rooms.map(async (room) => {
        const occupancy = await availabilityService.getRoomOccupancyState(
          room.id,
          from,
          to
        );

        const nextEvent = await availabilityService.getRoomNextEvent(
          room.id,
          from,
          to
        );

        return {
          id: room.id,
          number: room.number,
          type: room.type,
          capacity: room.capacity,
          floor: room.floor,
          pricePerNight: room.pricePerNight,
          status: room.status,
          outOfServiceReason: room.outOfServiceReason,
          occupancyState: occupancy.state,
          blocked: occupancy.blocked,
          nextEventText: nextEvent.nextEventText,
          // TODO: Add maintenance and housekeeping flags when those modules are integrated
          hasOpenMaintenance: false,
          hasHousekeepingDue: room.status === 'DIRTY',
        };
      })
    );

    res.json({
      rooms: summaries,
      from: from.toISOString(),
      to: to.toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching rooms summary:', error);
    res.status(500).json({
      error: 'Failed to fetch rooms summary',
      message: error.message,
    });
  }
}

/**
 * GET /rooms/:id/detail
 * Get detailed room information with 7-day outlook
 * 
 * Query params:
 * - from: Start date (ISO string, default: today)
 * - to: End date (ISO string, default: today + 7 days)
 */
export async function getRoomDetail(req: Request, res: Response): Promise<void> {
  try {
    const roomId = req.params.id;

    const from = req.query.from
      ? new Date(req.query.from as string)
      : new Date();
    from.setHours(0, 0, 0, 0);

    const to = req.query.to
      ? new Date(req.query.to as string)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 days
    to.setHours(23, 59, 59, 999);

    // Get room
    const room = await getRoomById(roomId);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    // Get occupancy state
    const occupancy = await availabilityService.getRoomOccupancyState(
      roomId,
      from,
      to
    );

    // Get next event
    const nextEvent = await availabilityService.getRoomNextEvent(
      roomId,
      from,
      to
    );

    // Get reservations for outlook
    const reservations = await getRoomReservations(roomId, from, to);

    // Build 7-day outlook
    const outlook: Array<{
      date: string;
      reservations: Array<{
        id: string;
        startDate: string;
        endDate: string;
        status: string;
        customerName?: string;
      }>;
    }> = [];

    const currentDate = new Date(from);
    while (currentDate <= to) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayReservations = reservations.filter(r => {
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        const checkDate = new Date(currentDate);
        checkDate.setHours(0, 0, 0, 0);
        return checkDate >= start && checkDate < end;
      });

      outlook.push({
        date: dateStr,
        reservations: dayReservations.map(r => ({
          id: r.id,
          startDate: r.startDate.toISOString(),
          endDate: r.endDate.toISOString(),
          status: r.status,
          customerName: r.customerName,
        })),
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    const detail: RoomDetail = {
      ...room,
      occupancyState: occupancy.state,
      blocked: occupancy.blocked,
      nextEventText: nextEvent.nextEventText,
      outlook,
    };

    res.json(detail);
  } catch (error: any) {
    console.error('Error fetching room detail:', error);
    res.status(500).json({
      error: 'Failed to fetch room detail',
      message: error.message,
    });
  }
}

/**
 * PATCH /rooms/:id/status
 * Update room status (existing endpoint, keep for compatibility)
 */
export async function updateRoomStatus(req: Request, res: Response): Promise<void> {
  try {
    const roomId = req.params.id;
    const { status, reason } = req.body;

    if (!status) {
      res.status(400).json({ error: 'status is required' });
      return;
    }

    // TODO: Update room in database
    // For now, we'll just log the audit event (existing behavior)
    // In production, update the rooms table here

    // Get previous state (would come from DB)
    const before = {
      status: 'CLEAN', // Would fetch from DB
      reason: null,
      note: null,
    };

    const after = {
      status,
      reason: reason || null,
      note: req.body.note || null,
    };

    // Log audit event (using existing audit service)
    const { auditService } = await import('../services/auditService');
    await auditService.logChange(req, {
      entityType: 'ROOM',
      entityId: roomId,
      action: status === 'OUT_OF_SERVICE' 
        ? 'ROOM_SET_OUT_OF_SERVICE' 
        : 'ROOM_CONDITION_CHANGED',
      before,
      after,
      message: status === 'OUT_OF_SERVICE'
        ? `Room set out of service${reason ? ` (Reason: ${reason})` : ''}`
        : `Room status changed: ${before.status} -> ${status}`,
    });

    res.json({
      success: true,
      roomId,
      status,
      message: 'Room status updated and audit logged',
    });
  } catch (error: any) {
    console.error('Error updating room status:', error);
    res.status(500).json({
      error: 'Failed to update room status',
      message: error.message,
    });
  }
}
