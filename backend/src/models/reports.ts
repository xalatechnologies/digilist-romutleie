/**
 * Reports Model
 * TypeScript interfaces for reporting endpoints
 */

export interface MonthlyOccupancyReport {
  month: number;
  year: number;
  roomsAvailable: number;
  roomNightsSold: number;
  guestNights: number;
  occupancyRate: number;
  arrivals: number;
  departures: number;
  byRoomType?: Array<{
    roomType: string;
    roomNightsSold: number;
    guestNights: number;
  }>;
}

export interface YearlyOccupancyReport {
  year: number;
  months: Array<{
    month: number;
    roomsAvailable: number;
    roomNightsSold: number;
    guestNights: number;
    occupancyRate: number;
    arrivals: number;
    departures: number;
  }>;
  totals: {
    roomNightsSold: number;
    guestNights: number;
    arrivals: number;
    departures: number;
    avgOccupancyRate: number;
  };
}

export interface InvoiceHistoryItem {
  invoiceId: string;
  customerName: string;
  status: string;
  total: number;
  createdAt: string;
  exportStatus?: string;
  lastError?: string;
}

export interface InvoiceHistoryReport {
  total: number;
  items: InvoiceHistoryItem[];
  aggregates?: {
    count: number;
    sumTotal: number;
  };
}

