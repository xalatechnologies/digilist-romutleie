/**
 * Database Queries for Dashboard Summary
 * Aggregated queries for dashboard widgets
 */

import { query } from './connection';
import { DashboardSummary } from '../models/dashboard';

/**
 * Get room counts by status
 */
export async function getRoomCounts(): Promise<{
  total: number;
  cleanCount: number;
  dirtyCount: number;
  outOfServiceCount: number;
}> {
  const sql = `
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'CLEAN') as "cleanCount",
      COUNT(*) FILTER (WHERE status = 'DIRTY') as "dirtyCount",
      COUNT(*) FILTER (WHERE status = 'OUT_OF_SERVICE') as "outOfServiceCount"
    FROM rooms
  `;

  const rows = await query<{
    total: string;
    cleanCount: string;
    dirtyCount: string;
    outOfServiceCount: string;
  }>(sql);

  const row = rows[0];
  return {
    total: parseInt(row.total || '0', 10),
    cleanCount: parseInt(row.cleanCount || '0', 10),
    dirtyCount: parseInt(row.dirtyCount || '0', 10),
    outOfServiceCount: parseInt(row.outOfServiceCount || '0', 10),
  };
}

/**
 * Get occupancy counts for a specific date
 */
export async function getOccupancyCounts(date: string): Promise<{
  occupiedToday: number;
  reservedToday: number;
  freeToday: number;
}> {
  const dateStart = `${date}T00:00:00Z`;
  const dateEnd = `${date}T23:59:59Z`;

  // Occupied: reservations with status=CHECKED_IN and date within range
  const occupiedSql = `
    SELECT COUNT(DISTINCT r.id) as count
    FROM reservations r
    WHERE r.status = 'CHECKED_IN'
      AND r.start_date <= $1
      AND r.end_date > $1
  `;

  // Reserved: reservations with status=CONFIRMED and overlaps date
  const reservedSql = `
    SELECT COUNT(DISTINCT r.id) as count
    FROM reservations r
    WHERE r.status = 'CONFIRMED'
      AND r.start_date <= $1
      AND r.end_date > $1
  `;

  // Out of service rooms
  const oosSql = `
    SELECT COUNT(*) as count
    FROM rooms
    WHERE status = 'OUT_OF_SERVICE'
  `;

  const [occupiedRows, reservedRows, oosRows, totalRows] = await Promise.all([
    query<{ count: string }>(occupiedSql, [dateEnd]),
    query<{ count: string }>(reservedSql, [dateEnd]),
    query<{ count: string }>(oosSql),
    query<{ total: string }>('SELECT COUNT(*) as total FROM rooms'),
  ]);

  const occupied = parseInt(occupiedRows[0]?.count || '0', 10);
  const reserved = parseInt(reservedRows[0]?.count || '0', 10);
  const outOfService = parseInt(oosRows[0]?.count || '0', 10);
  const total = parseInt(totalRows[0]?.total || '0', 10);

  // Free = total - occupied - reserved - outOfService
  const free = Math.max(0, total - occupied - reserved - outOfService);

  return {
    occupiedToday: occupied,
    reservedToday: reserved,
    freeToday: free,
  };
}

/**
 * Get arrivals for a specific date
 */
export async function getArrivals(date: string): Promise<{
  count: number;
  items: Array<{
    reservationId: string;
    roomId: string;
    roomNumber: string;
    customerName?: string;
    startDate: string;
    status: string;
  }>;
}> {
  const sql = `
    SELECT 
      r.id as "reservationId",
      r.room_id as "roomId",
      ro.number as "roomNumber",
      r.customer_name as "customerName",
      r.start_date as "startDate",
      r.status
    FROM reservations r
    INNER JOIN rooms ro ON r.room_id = ro.id
    WHERE DATE(r.start_date) = DATE($1)
      AND r.status IN ('CONFIRMED', 'CHECKED_IN')
    ORDER BY r.start_date ASC
  `;

  const rows = await query<{
    reservationId: string;
    roomId: string;
    roomNumber: string;
    customerName?: string;
    startDate: Date;
    status: string;
  }>(sql, [date]);

  return {
    count: rows.length,
    items: rows.map(row => ({
      reservationId: row.reservationId,
      roomId: row.roomId,
      roomNumber: row.roomNumber,
      customerName: row.customerName || undefined,
      startDate: row.startDate instanceof Date 
        ? row.startDate.toISOString() 
        : row.startDate,
      status: row.status,
    })),
  };
}

/**
 * Get departures for a specific date
 */
export async function getDepartures(date: string): Promise<{
  count: number;
  items: Array<{
    reservationId: string;
    roomId: string;
    roomNumber: string;
    endDate: string;
    status: string;
  }>;
}> {
  const sql = `
    SELECT 
      r.id as "reservationId",
      r.room_id as "roomId",
      ro.number as "roomNumber",
      r.end_date as "endDate",
      r.status
    FROM reservations r
    INNER JOIN rooms ro ON r.room_id = ro.id
    WHERE DATE(r.end_date) = DATE($1)
      AND r.status IN ('CHECKED_IN', 'CHECKED_OUT')
    ORDER BY r.end_date ASC
  `;

  const rows = await query<{
    reservationId: string;
    roomId: string;
    roomNumber: string;
    endDate: Date;
    status: string;
  }>(sql, [date]);

  return {
    count: rows.length,
    items: rows.map(row => ({
      reservationId: row.reservationId,
      roomId: row.roomId,
      roomNumber: row.roomNumber,
      endDate: row.endDate instanceof Date 
        ? row.endDate.toISOString() 
        : row.endDate,
      status: row.status,
    })),
  };
}

/**
 * Get housekeeping tasks due today
 */
export async function getHousekeepingTasks(date: string): Promise<{
  tasksDueToday: number;
  tasksPending: number;
  items: Array<{
    taskId: string;
    roomId: string;
    roomNumber: string;
    status: string;
    dueDate: string;
  }>;
}> {
  const sql = `
    SELECT 
      ht.id as "taskId",
      ht.room_id as "roomId",
      ro.number as "roomNumber",
      ht.status,
      ht.due_date as "dueDate"
    FROM housekeeping_tasks ht
    INNER JOIN rooms ro ON ht.room_id = ro.id
    WHERE DATE(ht.due_date) = DATE($1)
    ORDER BY ht.due_date ASC, ht.status ASC
  `;

  const rows = await query<{
    taskId: string;
    roomId: string;
    roomNumber: string;
    status: string;
    dueDate: Date;
  }>(sql, [date]);

  const tasksDueToday = rows.length;
  const tasksPending = rows.filter(r => r.status !== 'DONE').length;

  return {
    tasksDueToday,
    tasksPending,
    items: rows.map(row => ({
      taskId: row.taskId,
      roomId: row.roomId,
      roomNumber: row.roomNumber,
      status: row.status,
      dueDate: row.dueDate instanceof Date 
        ? row.dueDate.toISOString() 
        : row.dueDate,
    })),
  };
}

/**
 * Get kitchen orders for next 24 hours
 */
export async function getKitchenOrdersNext24h(date: string): Promise<{
  ordersNext24h: number;
  items: Array<{
    orderId: string;
    orderDateTime: string;
    itemName: string;
    quantity: number;
    location: string;
    status: string;
  }>;
}> {
  const dateStart = `${date}T00:00:00Z`;
  const dateEnd = new Date(new Date(dateStart).getTime() + 24 * 60 * 60 * 1000).toISOString();

  const sql = `
    SELECT 
      mo.id as "orderId",
      mo.order_datetime as "orderDateTime",
      ki.name as "itemName",
      mo.quantity,
      mo.serving_location as "location",
      mo.status
    FROM meal_orders mo
    INNER JOIN kitchen_items ki ON mo.kitchen_item_id = ki.id
    WHERE mo.order_datetime >= $1
      AND mo.order_datetime < $2
      AND mo.status != 'CANCELLED'
    ORDER BY mo.order_datetime ASC
  `;

  const rows = await query<{
    orderId: string;
    orderDateTime: Date;
    itemName: string;
    quantity: number;
    location: string;
    status: string;
  }>(sql, [dateStart, dateEnd]);

  return {
    ordersNext24h: rows.length,
    items: rows.map(row => ({
      orderId: row.orderId,
      orderDateTime: row.orderDateTime instanceof Date 
        ? row.orderDateTime.toISOString() 
        : row.orderDateTime,
      itemName: row.itemName,
      quantity: row.quantity,
      location: row.location,
      status: row.status,
    })),
  };
}

/**
 * Get billing summary
 */
export async function getBillingSummary(): Promise<{
  invoicesDraft: number;
  invoicesSent: number;
  invoicesPaid: number;
  vismaExportsPending: number;
  vismaExportsFailed: number;
}> {
  const invoicesSql = `
    SELECT 
      COUNT(*) FILTER (WHERE status = 'DRAFT') as "invoicesDraft",
      COUNT(*) FILTER (WHERE status = 'SENT') as "invoicesSent",
      COUNT(*) FILTER (WHERE status = 'PAID') as "invoicesPaid"
    FROM invoices
  `;

  const exportsSql = `
    SELECT 
      COUNT(*) FILTER (WHERE status = 'PENDING') as "vismaExportsPending",
      COUNT(*) FILTER (WHERE status = 'FAILED') as "vismaExportsFailed"
    FROM accounting_exports
    WHERE target_system = 'VISMA'
  `;

  const [invoiceRows, exportRows] = await Promise.all([
    query<{
      invoicesDraft: string;
      invoicesSent: string;
      invoicesPaid: string;
    }>(invoicesSql),
    query<{
      vismaExportsPending: string;
      vismaExportsFailed: string;
    }>(exportsSql),
  ]);

  const invoiceRow = invoiceRows[0];
  const exportRow = exportRows[0];

  return {
    invoicesDraft: parseInt(invoiceRow?.invoicesDraft || '0', 10),
    invoicesSent: parseInt(invoiceRow?.invoicesSent || '0', 10),
    invoicesPaid: parseInt(invoiceRow?.invoicesPaid || '0', 10),
    vismaExportsPending: parseInt(exportRow?.vismaExportsPending || '0', 10),
    vismaExportsFailed: parseInt(exportRow?.vismaExportsFailed || '0', 10),
  };
}

