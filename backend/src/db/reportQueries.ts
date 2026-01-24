/**
 * Database Queries for Reports
 * Aggregated queries for occupancy and invoice reports
 */

import { query } from './connection';
import { MonthlyOccupancyReport, YearlyOccupancyReport, InvoiceHistoryItem } from '../models/reports';

/**
 * Get monthly occupancy report
 */
export async function getMonthlyOccupancyReport(
  month: number,
  year: number
): Promise<MonthlyOccupancyReport> {
  // Calculate month boundaries
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthEnd = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

  // Get total rooms (excluding OUT_OF_SERVICE for the month)
  // Assumption: Use total rooms minus current OUT_OF_SERVICE count
  // This is a simplification - in reality, rooms might be OOS for part of the month
  const roomsSql = `
    SELECT COUNT(*) as total
    FROM rooms
    WHERE status != 'OUT_OF_SERVICE'
  `;
  const roomsRows = await query<{ total: string }>(roomsSql);
  const roomsAvailable = parseInt(roomsRows[0]?.total || '0', 10);

  // Calculate room nights sold (nights that overlap the month)
  // A reservation contributes nights where it overlaps the month window
  const roomNightsSql = `
    SELECT 
      COALESCE(SUM(
        GREATEST(0,
          LEAST(
            (r.end_date::date - r.start_date::date)::INTEGER,
            (DATE($2) - GREATEST(r.start_date::date, DATE($1)) + 1)::INTEGER,
            (LEAST(r.end_date::date, DATE($2)) - DATE($1) + 1)::INTEGER
          )
        )
      ), 0) as "roomNightsSold"
    FROM reservations r
    WHERE r.status IN ('CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT')
      AND r.start_date::date <= DATE($2)
      AND r.end_date::date > DATE($1)
  `;

  const roomNightsRows = await query<{ roomNightsSold: string }>(roomNightsSql, [monthStart, monthEnd]);
  const roomNightsSold = parseInt(roomNightsRows[0]?.roomNightsSold || '0', 10);

  // Calculate guest nights (room nights * guest_count)
  const guestNightsSql = `
    SELECT 
      COALESCE(SUM(
        GREATEST(0,
          LEAST(
            (r.end_date::date - r.start_date::date)::INTEGER,
            (DATE($2) - GREATEST(r.start_date::date, DATE($1)) + 1)::INTEGER,
            (LEAST(r.end_date::date, DATE($2)) - DATE($1) + 1)::INTEGER
          )
        ) * r.guest_count
      ), 0) as "guestNights"
    FROM reservations r
    WHERE r.status IN ('CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT')
      AND r.start_date::date <= DATE($2)
      AND r.end_date::date > DATE($1)
  `;

  const guestNightsRows = await query<{ guestNights: string }>(guestNightsSql, [monthStart, monthEnd]);
  const guestNights = parseInt(guestNightsRows[0]?.guestNights || '0', 10);

  // Calculate occupancy rate
  const roomNightsAvailable = roomsAvailable * new Date(year, month, 0).getDate(); // Days in month
  const occupancyRate = roomNightsAvailable > 0
    ? Math.round((roomNightsSold / roomNightsAvailable) * 100 * 100) / 100 // Round to 2 decimals
    : 0;

  // Count arrivals (reservations starting in month)
  const arrivalsSql = `
    SELECT COUNT(*) as count
    FROM reservations
    WHERE DATE(start_date) >= DATE($1)
      AND DATE(start_date) <= DATE($2)
      AND status IN ('CONFIRMED', 'CHECKED_IN')
  `;
  const arrivalsRows = await query<{ count: string }>(arrivalsSql, [monthStart, monthEnd]);
  const arrivals = parseInt(arrivalsRows[0]?.count || '0', 10);

  // Count departures (reservations ending in month)
  const departuresSql = `
    SELECT COUNT(*) as count
    FROM reservations
    WHERE DATE(end_date) >= DATE($1)
      AND DATE(end_date) <= DATE($2)
      AND status IN ('CHECKED_IN', 'CHECKED_OUT')
  `;
  const departuresRows = await query<{ count: string }>(departuresSql, [monthStart, monthEnd]);
  const departures = parseInt(departuresRows[0]?.count || '0', 10);

  return {
    month,
    year,
    roomsAvailable,
    roomNightsSold,
    guestNights,
    occupancyRate,
    arrivals,
    departures,
  };
}

/**
 * Get yearly occupancy report (12 months)
 */
export async function getYearlyOccupancyReport(year: number): Promise<YearlyOccupancyReport> {
  const months: Array<{
    month: number;
    roomsAvailable: number;
    roomNightsSold: number;
    guestNights: number;
    occupancyRate: number;
    arrivals: number;
    departures: number;
  }> = [];

  let totalRoomNightsSold = 0;
  let totalGuestNights = 0;
  let totalArrivals = 0;
  let totalDepartures = 0;
  let totalOccupancyRates = 0;

  // Get monthly reports for each month
  for (let month = 1; month <= 12; month++) {
    const monthly = await getMonthlyOccupancyReport(month, year);
    months.push({
      month: monthly.month,
      roomsAvailable: monthly.roomsAvailable,
      roomNightsSold: monthly.roomNightsSold,
      guestNights: monthly.guestNights,
      occupancyRate: monthly.occupancyRate,
      arrivals: monthly.arrivals,
      departures: monthly.departures,
    });

    totalRoomNightsSold += monthly.roomNightsSold;
    totalGuestNights += monthly.guestNights;
    totalArrivals += monthly.arrivals;
    totalDepartures += monthly.departures;
    totalOccupancyRates += monthly.occupancyRate;
  }

  const avgOccupancyRate = months.length > 0
    ? Math.round((totalOccupancyRates / months.length) * 100) / 100
    : 0;

  return {
    year,
    months,
    totals: {
      roomNightsSold: totalRoomNightsSold,
      guestNights: totalGuestNights,
      arrivals: totalArrivals,
      departures: totalDepartures,
      avgOccupancyRate,
    },
  };
}

/**
 * Get invoice history report (paginated)
 */
export async function getInvoiceHistoryReport(params: {
  from?: string;
  to?: string;
  status?: string;
  q?: string;
  exportStatus?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  total: number;
  items: InvoiceHistoryItem[];
  aggregates?: {
    count: number;
    sumTotal: number;
  };
}> {
  const limit = params.limit || 50;
  const offset = params.offset || 0;

  // Build WHERE clause
  const conditions: string[] = [];
  const queryParams: any[] = [];
  let paramIndex = 1;

  if (params.from) {
    conditions.push(`DATE(i.created_at) >= DATE($${paramIndex++})`);
    queryParams.push(params.from);
  }

  if (params.to) {
    conditions.push(`DATE(i.created_at) <= DATE($${paramIndex++})`);
    queryParams.push(params.to);
  }

  if (params.status) {
    conditions.push(`i.status = $${paramIndex++}`);
    queryParams.push(params.status);
  }

  if (params.q) {
    conditions.push(`(i.customer_name ILIKE $${paramIndex} OR i.id ILIKE $${paramIndex})`);
    queryParams.push(`%${params.q}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total
  const countSql = `SELECT COUNT(*) as total FROM invoices i ${whereClause}`;
  const countRows = await query<{ total: string }>(countSql, queryParams);
  const total = parseInt(countRows[0]?.total || '0', 10);

  // Get aggregates
  const aggregatesSql = `
    SELECT 
      COUNT(*) as count,
      COALESCE(SUM(i.total), 0) as "sumTotal"
    FROM invoices i
    ${whereClause}
  `;
  const aggregatesRows = await query<{ count: string; sumTotal: string }>(aggregatesSql, queryParams);
  const aggregates = {
    count: parseInt(aggregatesRows[0]?.count || '0', 10),
    sumTotal: parseFloat(aggregatesRows[0]?.sumTotal || '0'),
  };

  // Get items with export status
  const itemsSql = `
    SELECT 
      i.id as "invoiceId",
      i.customer_name as "customerName",
      i.status,
      i.total,
      i.created_at as "createdAt",
      COALESCE(ae.status, 'NONE') as "exportStatus",
      ae.last_error as "lastError"
    FROM invoices i
    LEFT JOIN accounting_exports ae ON i.id = ae.invoice_id AND ae.target_system = 'VISMA'
    ${whereClause}
    ORDER BY i.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  const queryParamsWithPagination = [...queryParams, limit, offset];
  const itemsRows = await query<{
    invoiceId: string;
    customerName: string;
    status: string;
    total: number;
    createdAt: Date;
    exportStatus: string;
    lastError?: string;
  }>(itemsSql, queryParamsWithPagination);

  const items: InvoiceHistoryItem[] = itemsRows.map(row => ({
    invoiceId: row.invoiceId,
    customerName: row.customerName,
    status: row.status,
    total: row.total,
    createdAt: row.createdAt instanceof Date
      ? row.createdAt.toISOString()
      : row.createdAt,
    exportStatus: row.exportStatus === 'NONE' ? undefined : row.exportStatus,
    lastError: row.lastError || undefined,
  }));

  // Filter by exportStatus if provided
  let filteredItems = items;
  if (params.exportStatus) {
    filteredItems = items.filter(item => item.exportStatus === params.exportStatus);
  }

  return {
    total,
    items: filteredItems,
    aggregates,
  };
}

