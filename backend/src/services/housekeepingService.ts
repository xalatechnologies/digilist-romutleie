/**
 * Housekeeping Service
 * Handles housekeeping task lifecycle and room condition updates
 */

import { Request } from 'express';
import { getHousekeepingTaskById, updateHousekeepingTask, getHousekeepingTasks } from '../db/housekeepingQueries';
import { query } from '../db/connection';
import { auditService } from './auditService';
import { RoomStatus } from '../models/room';
import { HousekeepingTaskUpdateInput } from '../models/reservation';
import { getRequestContext } from '../middleware/requestContext';

export class HousekeepingService {
  /**
   * Get housekeeping tasks with filters
   */
  async getTasks(filters?: {
    date?: string;
    status?: string;
    roomId?: string;
  }): Promise<any[]> {
    return await getHousekeepingTasks(filters);
  }

  /**
   * Update housekeeping task status
   * When marked DONE, sets room condition to CLEAN (unless OUT_OF_SERVICE)
   */
  async updateTask(
    req: Request,
    taskId: string,
    input: HousekeepingTaskUpdateInput
  ): Promise<any> {
    const context = getRequestContext(req);

    // Get current task
    const current = await getHousekeepingTaskById(taskId);
    if (!current) {
      throw new Error(`Housekeeping task ${taskId} not found`);
    }

    // Update task
    const updated = await updateHousekeepingTask(taskId, input);

    // Audit log
    if (input.status && input.status !== current.status) {
      await auditService.logChange(req, {
        entityType: 'HOUSEKEEPING_TASK',
        entityId: taskId,
        action: 'HOUSEKEEPING_TASK_STATUS_CHANGED',
        before: {
          status: current.status,
        },
        after: {
          status: updated.status,
        },
        message: `Housekeeping task status changed: ${current.status} → ${updated.status}`,
      });
    }

    // Handle DONE status: set room to CLEAN
    if (input.status === 'DONE' && current.status !== 'DONE') {
      await this.handleTaskCompleted(req, updated);
    }

    return updated;
  }

  /**
   * Update room condition (for housekeeping staff)
   */
  async updateRoomCondition(
    req: Request,
    roomId: string,
    condition: RoomStatus
  ): Promise<void> {
    const context = getRequestContext(req);

    // Validate condition (housekeeping can only set CLEAN or DIRTY)
    if (condition !== RoomStatus.CLEAN && condition !== RoomStatus.DIRTY) {
      throw new Error(`Housekeeping can only set room condition to CLEAN or DIRTY, not ${condition}`);
    }

    // Get current room status
    const roomResult = await query<{ status: string }>(
      'SELECT status FROM rooms WHERE id = $1',
      [roomId]
    );

    if (roomResult.length === 0) {
      throw new Error(`Room ${roomId} not found`);
    }

    const currentStatus = roomResult[0].status;

    // Don't change if OUT_OF_SERVICE
    if (currentStatus === RoomStatus.OUT_OF_SERVICE) {
      throw new Error(`Cannot change condition of room ${roomId}: room is OUT_OF_SERVICE`);
    }

    // Update room
    await query(
      'UPDATE rooms SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [condition, roomId]
    );

    // Audit log
    await auditService.logChange(req, {
      entityType: 'ROOM',
      entityId: roomId,
      action: condition === RoomStatus.CLEAN ? 'HOUSEKEEPING_MARKED_CLEAN' : 'HOUSEKEEPING_MARKED_DIRTY',
      before: {
        status: currentStatus,
      },
      after: {
        status: condition,
      },
      message: `Room condition changed to ${condition} by housekeeping`,
    });
  }

  /**
   * Handle task completion: set room to CLEAN
   */
  private async handleTaskCompleted(req: Request, task: any): Promise<void> {
    const context = getRequestContext(req);

    // Get current room status
    const roomResult = await query<{ status: string }>(
      'SELECT status FROM rooms WHERE id = $1',
      [task.roomId]
    );

    if (roomResult.length === 0) {
      throw new Error(`Room ${task.roomId} not found`);
    }

    const currentStatus = roomResult[0].status;

    // Don't change if OUT_OF_SERVICE
    if (currentStatus !== RoomStatus.OUT_OF_SERVICE) {
      await query(
        'UPDATE rooms SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [RoomStatus.CLEAN, task.roomId]
      );

      // Audit log
      await auditService.logChange(req, {
        entityType: 'ROOM',
        entityId: task.roomId,
        action: 'HOUSEKEEPING_MARKED_CLEAN',
        before: {
          status: currentStatus,
        },
        after: {
          status: RoomStatus.CLEAN,
        },
        message: `Room condition changed to CLEAN after housekeeping task ${task.id} completed`,
        metadata: {
          taskId: task.id,
          reservationId: task.reservationId,
        },
      });
    }
  }
}

export const housekeepingService = new HousekeepingService();

