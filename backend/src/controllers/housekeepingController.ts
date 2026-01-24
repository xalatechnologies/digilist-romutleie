/**
 * Housekeeping Controller
 * Handles housekeeping task endpoints
 */

import { Request, Response } from 'express';
import { housekeepingService } from '../services/housekeepingService';
import { HousekeepingTaskUpdateInput } from '../models/reservation';
import { RoomStatus } from '../models/room';
import { requireRole, UserRole } from '../middleware/rbac';

/**
 * GET /housekeeping/tasks
 * Get housekeeping tasks with filters
 * Required role: HOUSEKEEPING or ADMIN
 */
export async function getHousekeepingTasks(req: Request, res: Response): Promise<void> {
  try {
    const filters = {
      date: req.query.date as string | undefined,
      status: req.query.status as string | undefined,
      roomId: req.query.roomId as string | undefined,
    };

    const tasks = await housekeepingService.getTasks(filters);

    res.json({ tasks });
  } catch (error: any) {
    console.error('Error fetching housekeeping tasks:', error);
    res.status(500).json({
      error: 'Failed to fetch housekeeping tasks',
      message: error.message,
    });
  }
}

/**
 * PATCH /housekeeping/tasks/:id
 * Update housekeeping task status
 * Required role: HOUSEKEEPING or ADMIN
 */
export async function updateHousekeepingTask(req: Request, res: Response): Promise<void> {
  try {
    const taskId = req.params.id;
    const input: HousekeepingTaskUpdateInput = req.body;

    const task = await housekeepingService.updateTask(req, taskId, input);

    res.json(task);
  } catch (error: any) {
    console.error('Error updating housekeeping task:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: 'Failed to update housekeeping task',
      message: error.message,
    });
  }
}

/**
 * PATCH /rooms/:id/condition
 * Update room condition (CLEAN/DIRTY only)
 * Required role: HOUSEKEEPING or ADMIN
 */
export async function updateRoomCondition(req: Request, res: Response): Promise<void> {
  try {
    const roomId = req.params.id;
    const { condition } = req.body;

    if (!condition) {
      res.status(400).json({
        error: 'Missing required field',
        message: 'condition is required',
      });
      return;
    }

    if (condition !== RoomStatus.CLEAN && condition !== RoomStatus.DIRTY) {
      res.status(400).json({
        error: 'Invalid condition',
        message: 'Housekeeping can only set condition to CLEAN or DIRTY',
      });
      return;
    }

    await housekeepingService.updateRoomCondition(req, roomId, condition);

    res.json({
      success: true,
      roomId,
      condition,
      message: 'Room condition updated',
    });
  } catch (error: any) {
    console.error('Error updating room condition:', error);
    const statusCode = error.message.includes('not found') ? 404 : 
                      error.message.includes('OUT_OF_SERVICE') ? 400 : 500;
    res.status(statusCode).json({
      error: 'Failed to update room condition',
      message: error.message,
    });
  }
}

// Export middleware for route protection
export const requireHousekeeping = requireRole([UserRole.HOUSEKEEPING, UserRole.ADMIN]);

