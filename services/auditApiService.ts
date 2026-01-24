/**
 * Audit API Service
 * Fetches audit logs from backend API
 */

import { apiClient } from '../utils/apiClient';
import { IAuditLog } from '../types';

export interface AuditLogQueryParams {
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  action?: string;
  from?: string; // ISO date string
  to?: string; // ISO date string
  q?: string; // Search in message
  limit?: number;
  offset?: number;
}

export interface AuditLogResponse {
  logs: IAuditLog[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Fetch audit logs from backend
 */
export async function fetchAuditLogs(params: AuditLogQueryParams = {}): Promise<AuditLogResponse> {
  try {
    const queryParams: Record<string, string | number> = {};
    
    if (params.entityType) queryParams.entityType = params.entityType;
    if (params.entityId) queryParams.entityId = params.entityId;
    if (params.actorUserId) queryParams.actorUserId = params.actorUserId;
    if (params.action) queryParams.action = params.action;
    if (params.from) queryParams.from = params.from;
    if (params.to) queryParams.to = params.to;
    if (params.q) queryParams.q = params.q;
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.offset !== undefined) queryParams.offset = params.offset;

    return await apiClient.get<AuditLogResponse>('/audit', queryParams);
  } catch (error: any) {
    console.error('Failed to fetch audit logs:', error);
    // Return empty result on error (graceful degradation)
    return {
      logs: [],
      total: 0,
      limit: params.limit || 50,
      offset: params.offset || 0,
    };
  }
}

/**
 * Fetch audit logs for a specific entity
 */
export async function fetchEntityAuditLogs(
  entityType: string,
  entityId: string,
  limit: number = 20
): Promise<IAuditLog[]> {
  const response = await fetchAuditLogs({
    entityType,
    entityId,
    limit,
    offset: 0,
  });
  return response.logs;
}

