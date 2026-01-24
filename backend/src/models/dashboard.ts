/**
 * Dashboard Model
 * TypeScript interfaces for dashboard summary
 */

export interface DashboardSummary {
  date: string;
  rooms: {
    total: number;
    cleanCount: number;
    dirtyCount: number;
    outOfServiceCount: number;
  };
  occupancy: {
    occupiedToday: number;
    reservedToday: number;
    freeToday: number;
  };
  arrivals: {
    count: number;
    items: Array<{
      reservationId: string;
      roomId: string;
      roomNumber: string;
      customerName?: string;
      startDate: string;
      status: string;
    }>;
  };
  departures: {
    count: number;
    items: Array<{
      reservationId: string;
      roomId: string;
      roomNumber: string;
      endDate: string;
      status: string;
    }>;
  };
  housekeeping: {
    tasksDueToday: number;
    tasksPending: number;
    items: Array<{
      taskId: string;
      roomId: string;
      roomNumber: string;
      status: string;
      dueDate: string;
    }>;
  };
  kitchen?: {
    ordersNext24h: number;
    items: Array<{
      orderId: string;
      orderDateTime: string;
      itemName: string;
      quantity: number;
      location: string;
      status: string;
    }>;
  };
  billing?: {
    invoicesDraft: number;
    invoicesSent: number;
    invoicesPaid: number;
    vismaExportsPending: number;
    vismaExportsFailed: number;
  };
}

