/**
 * Database Queries for Group Billing
 */

import { query, queryOne } from './connection';

export interface BookingGroup {
  id: string;
  customerName: string;
  reference1?: string;
  reference2?: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupSummary {
  groupId: string;
  title?: string;
  reference1?: string;
  reference2?: string;
  customerName: string;
  reservationCount: number;
  dateRange: {
    minStartDate: Date;
    maxEndDate: Date;
  };
  estimatedTotal: number;
}

/**
 * Get booking groups suitable for invoicing
 */
export async function getGroupsForInvoicing(filters?: {
  from?: string;
  to?: string;
  q?: string;
}): Promise<GroupSummary[]> {
  let sql = `
    SELECT 
      bg.id as "groupId",
      bg.title,
      bg.reference1,
      bg.reference2,
      bg.customer_name as "customerName",
      COUNT(DISTINCT r.id) as "reservationCount",
      MIN(r.start_date) as "minStartDate",
      MAX(r.end_date) as "maxEndDate"
    FROM booking_groups bg
    LEFT JOIN reservations r ON r.booking_group_id = bg.id
      AND r.status IN ('CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT')
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.from) {
    sql += ` AND r.start_date >= $${paramIndex++}`;
    params.push(filters.from);
  }

  if (filters?.to) {
    sql += ` AND r.end_date <= $${paramIndex++}`;
    params.push(filters.to);
  }

  if (filters?.q) {
    sql += ` AND (
      bg.title ILIKE $${paramIndex} OR 
      bg.customer_name ILIKE $${paramIndex} OR
      bg.reference1 ILIKE $${paramIndex} OR
      bg.reference2 ILIKE $${paramIndex}
    )`;
    params.push(`%${filters.q}%`);
    paramIndex++;
  }

  sql += `
    GROUP BY bg.id, bg.title, bg.reference1, bg.reference2, bg.customer_name
    HAVING COUNT(DISTINCT r.id) > 0
    ORDER BY bg.created_at DESC
  `;

  const rows = await query<GroupSummary & { minStartDate: Date; maxEndDate: Date }>(sql, params);

  // Calculate estimated total (simplified - sum of room nights + meal orders)
  const groupsWithTotals = await Promise.all(
    rows.map(async (row) => {
      // Get room charges estimate
      const roomEstimateSql = `
        SELECT COALESCE(SUM(
          EXTRACT(DAY FROM (r.end_date - r.start_date))::INTEGER
        ), 0) as nights
        FROM reservations r
        WHERE r.booking_group_id = $1
          AND r.status IN ('CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT')
      `;
      const roomResult = await queryOne<{ nights: number }>(roomEstimateSql, [row.groupId]);
      const nights = roomResult?.nights || 0;

      // Get meal order charges
      const mealEstimateSql = `
        SELECT COALESCE(SUM(mo.quantity * ki.unit_price), 0) as mealTotal
        FROM meal_orders mo
        JOIN kitchen_items ki ON mo.kitchen_item_id = ki.id
        WHERE mo.booking_group_id = $1
          AND mo.status != 'CANCELLED'
      `;
      const mealResult = await queryOne<{ mealTotal: number }>(mealEstimateSql, [row.groupId]);
      const mealTotal = mealResult?.mealTotal || 0;

      // Rough estimate (assumes 1000 NOK per night - will be overridden in preview)
      const estimatedTotal = (nights * 1000) + mealTotal;

      return {
        ...row,
        dateRange: {
          minStartDate: row.minStartDate,
          maxEndDate: row.maxEndDate,
        },
        estimatedTotal,
      };
    })
  );

  return groupsWithTotals;
}

/**
 * Get booking group by ID
 */
export async function getBookingGroupById(id: string): Promise<BookingGroup | null> {
  const sql = `
    SELECT 
      id, customer_name as "customerName",
      reference1, reference2, title,
      created_at as "createdAt", updated_at as "updatedAt"
    FROM booking_groups
    WHERE id = $1
  `;
  return await queryOne<BookingGroup>(sql, [id]);
}

/**
 * Get invoice by booking group ID (for idempotency check)
 */
export async function getInvoiceByBookingGroupId(bookingGroupId: string): Promise<{ id: string } | null> {
  const sql = `
    SELECT id
    FROM invoices
    WHERE booking_group_id = $1
      AND status != 'VOID'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return await queryOne<{ id: string }>(sql, [bookingGroupId]);
}

