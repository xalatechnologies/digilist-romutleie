/**
 * Dashboard API Service
 * Frontend service for dashboard operations
 */

import { apiClient } from '../utils/apiClient';

export interface DashboardRooms {
  total: number;
  cleanCount: number;
  dirtyCount: number;
  outOfServiceCount: number;
}

export interface DashboardOccupancy {
  occupiedToday: number;
  reservedToday: number;
  freeToday: number;
}

export interface DashboardArrivalItem {
  reservationId: string;
  roomId: string;
  roomNumber: string;
  customerName?: string;
  startDate: string;
  status: string;
}

export interface DashboardArrivals {
  count: number;
  items: DashboardArrivalItem[];
}

export interface DashboardDepartureItem {
  reservationId: string;
  roomId: string;
  roomNumber: string;
  endDate: string;
  status: string;
}

export interface DashboardDepartures {
  count: number;
  items: DashboardDepartureItem[];
}

export interface DashboardHousekeepingItem {
  taskId: string;
  roomId: string;
  roomNumber: string;
  status: string;
  dueDate: string;
}

export interface DashboardHousekeeping {
  tasksDueToday: number;
  tasksPending: number;
  items: DashboardHousekeepingItem[];
}

export interface DashboardKitchenItem {
  orderId: string;
  orderDateTime: string;
  itemName: string;
  quantity: number;
  location: string;
  status: string;
}

export interface DashboardKitchen {
  ordersNext24h: number;
  items: DashboardKitchenItem[];
}

export interface DashboardBilling {
  invoicesDraft: number;
  invoicesSent: number;
  invoicesPaid: number;
  vismaExportsPending: number;
  vismaExportsFailed: number;
}

export interface DashboardSummary {
  date: string;
  rooms: DashboardRooms;
  occupancy: DashboardOccupancy;
  arrivals: DashboardArrivals;
  departures: DashboardDepartures;
  housekeeping: DashboardHousekeeping;
  kitchen?: DashboardKitchen;
  billing?: DashboardBilling;
}

/**
 * Get dashboard summary
 */
export async function getDashboardSummary(date?: string): Promise<DashboardSummary> {
  const params: Record<string, string> = {};
  if (date) {
    params.date = date;
  }
  return await apiClient.get<DashboardSummary>('/dashboard/summary', params);
}

