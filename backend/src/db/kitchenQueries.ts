/**
 * Database Queries for Kitchen Module
 */

import { query, queryOne } from './connection';
import { KitchenItem, MealOrder, KitchenItemCreateInput, KitchenItemUpdateInput, MealOrderCreateInput, MealOrderUpdateInput } from '../models/kitchen';

/**
 * Get all kitchen items
 */
export async function getKitchenItems(activeOnly: boolean = false): Promise<KitchenItem[]> {
  let sql = `
    SELECT 
      id, name, description, unit_price as "unitPrice",
      vat_code as "vatCode", is_active as "isActive",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM kitchen_items
  `;
  
  if (activeOnly) {
    sql += ' WHERE is_active = true';
  }
  
  sql += ' ORDER BY name ASC';
  
  return await query<KitchenItem>(sql);
}

/**
 * Get kitchen item by ID
 */
export async function getKitchenItemById(id: string): Promise<KitchenItem | null> {
  const sql = `
    SELECT 
      id, name, description, unit_price as "unitPrice",
      vat_code as "vatCode", is_active as "isActive",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM kitchen_items
    WHERE id = $1
  `;
  return await queryOne<KitchenItem>(sql, [id]);
}

/**
 * Create kitchen item
 */
export async function createKitchenItem(
  input: KitchenItemCreateInput & { id: string }
): Promise<KitchenItem> {
  const sql = `
    INSERT INTO kitchen_items (
      id, name, description, unit_price, vat_code, is_active,
      created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING 
      id, name, description, unit_price as "unitPrice",
      vat_code as "vatCode", is_active as "isActive",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  const rows = await query<KitchenItem>(sql, [
    input.id,
    input.name,
    input.description || null,
    input.unitPrice,
    input.vatCode,
    input.isActive !== undefined ? input.isActive : true,
  ]);

  return rows[0];
}

/**
 * Update kitchen item
 */
export async function updateKitchenItem(
  id: string,
  input: KitchenItemUpdateInput
): Promise<KitchenItem> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(input.name);
  }

  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(input.description);
  }

  if (input.unitPrice !== undefined) {
    updates.push(`unit_price = $${paramIndex++}`);
    params.push(input.unitPrice);
  }

  if (input.vatCode !== undefined) {
    updates.push(`vat_code = $${paramIndex++}`);
    params.push(input.vatCode);
  }

  if (input.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    params.push(input.isActive);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(id);

  const sql = `
    UPDATE kitchen_items
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING 
      id, name, description, unit_price as "unitPrice",
      vat_code as "vatCode", is_active as "isActive",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  const rows = await query<KitchenItem>(sql, params);
  if (rows.length === 0) {
    throw new Error(`Kitchen item ${id} not found`);
  }
  return rows[0];
}

/**
 * Get meal orders with filters
 */
export async function getMealOrders(filters?: {
  from?: string;
  to?: string;
  status?: string;
  reservationId?: string;
  bookingGroupId?: string;
  q?: string;
}): Promise<MealOrder[]> {
  let sql = `
    SELECT 
      mo.id, mo.reservation_id as "reservationId",
      mo.booking_group_id as "bookingGroupId",
      mo.kitchen_item_id as "kitchenItemId",
      mo.order_datetime as "orderDateTime",
      mo.quantity, mo.serving_location as "servingLocation",
      mo.reference_text as "referenceText", mo.notes,
      mo.status, mo.created_by as "createdBy",
      mo.created_at as "createdAt", mo.updated_at as "updatedAt"
    FROM meal_orders mo
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.from) {
    sql += ` AND mo.order_datetime >= $${paramIndex++}`;
    params.push(filters.from);
  }

  if (filters?.to) {
    sql += ` AND mo.order_datetime <= $${paramIndex++}`;
    params.push(filters.to);
  }

  if (filters?.status) {
    sql += ` AND mo.status = $${paramIndex++}`;
    params.push(filters.status);
  }

  if (filters?.reservationId) {
    sql += ` AND mo.reservation_id = $${paramIndex++}`;
    params.push(filters.reservationId);
  }

  if (filters?.bookingGroupId) {
    sql += ` AND mo.booking_group_id = $${paramIndex++}`;
    params.push(filters.bookingGroupId);
  }

  if (filters?.q) {
    sql += ` AND (mo.reference_text ILIKE $${paramIndex} OR mo.serving_location ILIKE $${paramIndex})`;
    params.push(`%${filters.q}%`);
    paramIndex++;
  }

  sql += ` ORDER BY mo.order_datetime ASC`;

  return await query<MealOrder>(sql, params);
}

/**
 * Get meal order by ID
 */
export async function getMealOrderById(id: string): Promise<MealOrder | null> {
  const sql = `
    SELECT 
      mo.id, mo.reservation_id as "reservationId",
      mo.booking_group_id as "bookingGroupId",
      mo.kitchen_item_id as "kitchenItemId",
      mo.order_datetime as "orderDateTime",
      mo.quantity, mo.serving_location as "servingLocation",
      mo.reference_text as "referenceText", mo.notes,
      mo.status, mo.created_by as "createdBy",
      mo.created_at as "createdAt", mo.updated_at as "updatedAt"
    FROM meal_orders mo
    WHERE mo.id = $1
  `;
  return await queryOne<MealOrder>(sql, [id]);
}

/**
 * Create meal order
 */
export async function createMealOrder(
  input: MealOrderCreateInput & { id: string; createdBy?: string }
): Promise<MealOrder> {
  const sql = `
    INSERT INTO meal_orders (
      id, reservation_id, booking_group_id, kitchen_item_id,
      order_datetime, quantity, serving_location, reference_text,
      notes, status, created_by, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING 
      id, reservation_id as "reservationId",
      booking_group_id as "bookingGroupId",
      kitchen_item_id as "kitchenItemId",
      order_datetime as "orderDateTime",
      quantity, serving_location as "servingLocation",
      reference_text as "referenceText", notes,
      status, created_by as "createdBy",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  const rows = await query<MealOrder>(sql, [
    input.id,
    input.reservationId || null,
    input.bookingGroupId || null,
    input.kitchenItemId,
    input.orderDateTime,
    input.quantity,
    input.servingLocation,
    input.referenceText || null,
    input.notes || null,
    'PLANNED',
    input.createdBy || null,
  ]);

  return rows[0];
}

/**
 * Update meal order (limited fields)
 */
export async function updateMealOrder(
  id: string,
  input: MealOrderUpdateInput
): Promise<MealOrder> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (input.servingLocation !== undefined) {
    updates.push(`serving_location = $${paramIndex++}`);
    params.push(input.servingLocation);
  }

  if (input.referenceText !== undefined) {
    updates.push(`reference_text = $${paramIndex++}`);
    params.push(input.referenceText);
  }

  if (input.notes !== undefined) {
    updates.push(`notes = $${paramIndex++}`);
    params.push(input.notes);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(id);

  const sql = `
    UPDATE meal_orders
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING 
      id, reservation_id as "reservationId",
      booking_group_id as "bookingGroupId",
      kitchen_item_id as "kitchenItemId",
      order_datetime as "orderDateTime",
      quantity, serving_location as "servingLocation",
      reference_text as "referenceText", notes,
      status, created_by as "createdBy",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  const rows = await query<MealOrder>(sql, params);
  if (rows.length === 0) {
    throw new Error(`Meal order ${id} not found`);
  }
  return rows[0];
}

/**
 * Update meal order status
 */
export async function updateMealOrderStatus(
  id: string,
  status: 'PLANNED' | 'IN_PREP' | 'READY' | 'DELIVERED' | 'CANCELLED'
): Promise<MealOrder> {
  const sql = `
    UPDATE meal_orders
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING 
      id, reservation_id as "reservationId",
      booking_group_id as "bookingGroupId",
      kitchen_item_id as "kitchenItemId",
      order_datetime as "orderDateTime",
      quantity, serving_location as "servingLocation",
      reference_text as "referenceText", notes,
      status, created_by as "createdBy",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  const rows = await query<MealOrder>(sql, [status, id]);
  if (rows.length === 0) {
    throw new Error(`Meal order ${id} not found`);
  }
  return rows[0];
}

/**
 * Get kitchen board items (optimized for board view)
 */
export async function getKitchenBoard(filters?: {
  from?: string;
  to?: string;
  status?: string;
}): Promise<any[]> {
  let sql = `
    SELECT 
      mo.id as "orderId",
      mo.order_datetime as "orderDateTime",
      ki.name as "itemName",
      mo.quantity,
      mo.serving_location as "location",
      mo.reference_text as "referenceText",
      mo.notes,
      mo.status
    FROM meal_orders mo
    INNER JOIN kitchen_items ki ON mo.kitchen_item_id = ki.id
    WHERE mo.status != 'CANCELLED'
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.from) {
    sql += ` AND mo.order_datetime >= $${paramIndex++}`;
    params.push(filters.from);
  }

  if (filters?.to) {
    sql += ` AND mo.order_datetime <= $${paramIndex++}`;
    params.push(filters.to);
  }

  if (filters?.status) {
    sql += ` AND mo.status = $${paramIndex++}`;
    params.push(filters.status);
  }

  sql += ` ORDER BY mo.order_datetime ASC`;

  const rows = await query(sql, params);
  
  // Format dates as ISO strings
  return rows.map(row => ({
    ...row,
    orderDateTime: row.orderDateTime instanceof Date 
      ? row.orderDateTime.toISOString() 
      : row.orderDateTime,
  }));
}

