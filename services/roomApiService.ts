/**
 * Room API Service
 * Fetches room data from backend API
 */

import { apiClient } from '../utils/apiClient';
import { IRoomSummary, RoomStatus, RoomOccupancy } from '../types';

export interface RoomSummaryResponse {
  rooms: RoomSummary[];
  from: string;
  to: string;
}

export interface RoomSummary {
  id: string;
  number: string;
  type: string;
  capacity: number;
  floor?: number;
  pricePerNight?: number;
  status: RoomStatus;
  outOfServiceReason?: string;
  occupancyState: RoomOccupancy | 'BLOCKED';
  blocked: boolean;
  nextEventText: string;
  hasOpenMaintenance?: boolean;
  hasHousekeepingDue?: boolean;
}

export interface RoomDetailResponse {
  id: string;
  number: string;
  type: string;
  capacity: number;
  floor?: number;
  pricePerNight?: number;
  status: RoomStatus;
  outOfServiceReason?: string;
  outOfServiceNote?: string;
  expectedReturnDate?: string;
  linkedTicketId?: string;
  occupancyState: RoomOccupancy | 'BLOCKED';
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
 * Fetch room summaries from backend
 */
export async function fetchRoomSummaries(params?: {
  from?: string;
  to?: string;
  status?: RoomStatus;
  type?: string;
  q?: string;
}): Promise<RoomSummaryResponse> {
  try {
    const queryParams: Record<string, string> = {};
    
    if (params?.from) queryParams.from = params.from;
    if (params?.to) queryParams.to = params.to;
    if (params?.status) queryParams.status = params.status;
    if (params?.type) queryParams.type = params.type;
    if (params?.q) queryParams.q = params.q;

    return await apiClient.get<RoomSummaryResponse>('/rooms/summary', queryParams);
  } catch (error: any) {
    console.error('Failed to fetch room summaries:', error);
    // Return empty result on error (graceful degradation)
    return {
      rooms: [],
      from: params?.from || new Date().toISOString(),
      to: params?.to || new Date().toISOString(),
    };
  }
}

/**
 * Fetch room detail from backend
 */
export async function fetchRoomDetail(
  roomId: string,
  params?: {
    from?: string;
    to?: string;
  }
): Promise<RoomDetailResponse> {
  try {
    const queryParams: Record<string, string> = {};
    
    if (params?.from) queryParams.from = params.from;
    if (params?.to) queryParams.to = params.to;

    return await apiClient.get<RoomDetailResponse>(`/rooms/${roomId}/detail`, queryParams);
  } catch (error: any) {
    console.error('Failed to fetch room detail:', error);
    throw error;
  }
}

