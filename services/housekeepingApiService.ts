/**
 * Housekeeping API Service
 * Frontend service for housekeeping operations
 */

import { apiClient } from '../utils/apiClient';

export interface HousekeepingTaskUpdateInput {
  status?: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  note?: string;
}

/**
 * Get housekeeping tasks
 */
export async function getHousekeepingTasks(params?: {
  date?: string;
  status?: string;
  roomId?: string;
}) {
  const queryParams: Record<string, string> = {};
  if (params?.date) queryParams.date = params.date;
  if (params?.status) queryParams.status = params.status;
  if (params?.roomId) queryParams.roomId = params.roomId;

  return await apiClient.get<{ tasks: any[] }>('/housekeeping/tasks', queryParams);
}

/**
 * Update housekeeping task
 */
export async function updateHousekeepingTask(
  taskId: string,
  input: HousekeepingTaskUpdateInput
) {
  return await apiClient.patch(`/housekeeping/tasks/${taskId}`, input);
}

/**
 * Update room condition
 */
export async function updateRoomCondition(roomId: string, condition: 'CLEAN' | 'DIRTY') {
  return await apiClient.patch(`/rooms/${roomId}/condition`, { condition });
}

