/**
 * Kitchen API Service
 * Frontend service for kitchen operations
 */

import { apiClient } from '../utils/apiClient';

export interface KitchenItem {
  id: string;
  name: string;
  description?: string;
  unitPrice: number;
  vatCode: 'VAT_15' | 'VAT_25';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MealOrder {
  id: string;
  reservationId?: string;
  bookingGroupId?: string;
  kitchenItemId: string;
  orderDateTime: string;
  quantity: number;
  servingLocation: string;
  referenceText?: string;
  notes?: string;
  status: 'PLANNED' | 'IN_PREP' | 'READY' | 'DELIVERED' | 'CANCELLED';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KitchenBoardItem {
  orderId: string;
  orderDateTime: string;
  itemName: string;
  quantity: number;
  location: string;
  referenceText?: string;
  notes?: string;
  status: string;
}

/**
 * Get kitchen items
 */
export async function getKitchenItems(activeOnly: boolean = false): Promise<{ items: KitchenItem[] }> {
  const params: Record<string, string> = {};
  if (activeOnly) {
    params.active = 'true';
  }
  return await apiClient.get<{ items: KitchenItem[] }>('/kitchen/items', params);
}

/**
 * Create kitchen item
 */
export async function createKitchenItem(input: {
  name: string;
  description?: string;
  unitPrice: number;
  vatCode: 'VAT_15' | 'VAT_25';
  isActive?: boolean;
}): Promise<KitchenItem> {
  return await apiClient.post<KitchenItem>('/kitchen/items', input);
}

/**
 * Update kitchen item
 */
export async function updateKitchenItem(
  itemId: string,
  input: {
    name?: string;
    description?: string;
    unitPrice?: number;
    vatCode?: 'VAT_15' | 'VAT_25';
    isActive?: boolean;
  }
): Promise<KitchenItem> {
  return await apiClient.patch<KitchenItem>(`/kitchen/items/${itemId}`, input);
}

/**
 * Get meal orders
 */
export async function getMealOrders(params?: {
  from?: string;
  to?: string;
  status?: string;
  reservationId?: string;
  bookingGroupId?: string;
  q?: string;
}): Promise<{ orders: MealOrder[] }> {
  const queryParams: Record<string, string> = {};
  if (params?.from) queryParams.from = params.from;
  if (params?.to) queryParams.to = params.to;
  if (params?.status) queryParams.status = params.status;
  if (params?.reservationId) queryParams.reservationId = params.reservationId;
  if (params?.bookingGroupId) queryParams.bookingGroupId = params.bookingGroupId;
  if (params?.q) queryParams.q = params.q;

  return await apiClient.get<{ orders: MealOrder[] }>('/kitchen/orders', queryParams);
}

/**
 * Create meal order
 */
export async function createMealOrder(input: {
  reservationId?: string;
  bookingGroupId?: string;
  kitchenItemId: string;
  orderDateTime: string;
  quantity: number;
  servingLocation: string;
  referenceText?: string;
  notes?: string;
}): Promise<MealOrder> {
  return await apiClient.post<MealOrder>('/kitchen/orders', input);
}

/**
 * Update meal order
 */
export async function updateMealOrder(
  orderId: string,
  input: {
    servingLocation?: string;
    referenceText?: string;
    notes?: string;
  }
): Promise<MealOrder> {
  return await apiClient.patch<MealOrder>(`/kitchen/orders/${orderId}`, input);
}

/**
 * Update meal order status
 */
export async function updateMealOrderStatus(
  orderId: string,
  status: 'PLANNED' | 'IN_PREP' | 'READY' | 'DELIVERED' | 'CANCELLED'
): Promise<MealOrder> {
  return await apiClient.patch<MealOrder>(`/kitchen/orders/${orderId}/status`, { status });
}

/**
 * Get kitchen board
 */
export async function getKitchenBoard(params?: {
  from?: string;
  to?: string;
  status?: string;
}): Promise<{ board: KitchenBoardItem[] }> {
  const queryParams: Record<string, string> = {};
  if (params?.from) queryParams.from = params.from;
  if (params?.to) queryParams.to = params.to;
  if (params?.status) queryParams.status = params.status;

  return await apiClient.get<{ board: KitchenBoardItem[] }>('/kitchen/board', queryParams);
}

