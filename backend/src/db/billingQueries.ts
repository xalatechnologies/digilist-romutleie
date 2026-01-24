/**
 * Database Queries for Billing Module
 */

import { query, queryOne } from './connection';
import { Invoice, InvoiceLine, Payment } from '../models/billing';

/**
 * Get invoice by ID
 */
export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const sql = `
    SELECT 
      id, reservation_id as "reservationId",
      booking_group_id as "bookingGroupId",
      customer_name as "customerName",
      status, reference1, reference2, currency,
      subtotal, vat_total as "vatTotal", total,
      created_by as "createdBy",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM invoices
    WHERE id = $1
  `;
  return await queryOne<Invoice>(sql, [id]);
}

/**
 * Get invoice by reservation ID
 */
export async function getInvoiceByReservationId(reservationId: string): Promise<Invoice | null> {
  const sql = `
    SELECT 
      id, reservation_id as "reservationId",
      booking_group_id as "bookingGroupId",
      customer_name as "customerName",
      status, reference1, reference2, currency,
      subtotal, vat_total as "vatTotal", total,
      created_by as "createdBy",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM invoices
    WHERE reservation_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return await queryOne<Invoice>(sql, [reservationId]);
}

/**
 * Create invoice
 */
export async function createInvoice(input: {
  id: string;
  reservationId?: string;
  bookingGroupId?: string;
  customerName: string;
  reference1: string;
  reference2: string;
  createdBy?: string;
}): Promise<Invoice> {
  const sql = `
    INSERT INTO invoices (
      id, reservation_id, booking_group_id, customer_name,
      status, reference1, reference2, currency,
      subtotal, vat_total, total, created_by,
      created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, 'DRAFT', $5, $6, 'NOK', 0, 0, 0, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING 
      id, reservation_id as "reservationId",
      booking_group_id as "bookingGroupId",
      customer_name as "customerName",
      status, reference1, reference2, currency,
      subtotal, vat_total as "vatTotal", total,
      created_by as "createdBy",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  const rows = await query<Invoice>(sql, [
    input.id,
    input.reservationId || null,
    input.bookingGroupId || null,
    input.customerName,
    input.reference1,
    input.reference2,
    input.createdBy || null,
  ]);

  return rows[0];
}

/**
 * Update invoice
 */
export async function updateInvoice(
  id: string,
  input: {
    reference1?: string;
    reference2?: string;
    status?: string;
  }
): Promise<Invoice> {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (input.reference1 !== undefined) {
    updates.push(`reference1 = $${paramIndex++}`);
    params.push(input.reference1);
  }

  if (input.reference2 !== undefined) {
    updates.push(`reference2 = $${paramIndex++}`);
    params.push(input.reference2);
  }

  if (input.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    params.push(input.status);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(id);

  const sql = `
    UPDATE invoices
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING 
      id, reservation_id as "reservationId",
      booking_group_id as "bookingGroupId",
      customer_name as "customerName",
      status, reference1, reference2, currency,
      subtotal, vat_total as "vatTotal", total,
      created_by as "createdBy",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  const rows = await query<Invoice>(sql, params);
  if (rows.length === 0) {
    throw new Error(`Invoice ${id} not found`);
  }
  return rows[0];
}

/**
 * Recalculate invoice totals
 */
export async function recalculateInvoiceTotals(invoiceId: string): Promise<Invoice> {
  // Calculate totals from lines
  const totalsSql = `
    SELECT 
      COALESCE(SUM(line_total - vat_amount), 0) as subtotal,
      COALESCE(SUM(vat_amount), 0) as vat_total,
      COALESCE(SUM(line_total), 0) as total
    FROM invoice_lines
    WHERE invoice_id = $1
  `;
  const totals = await queryOne<{ subtotal: number; vat_total: number; total: number }>(totalsSql, [invoiceId]);

  // Update invoice
  const updateSql = `
    UPDATE invoices
    SET subtotal = $1, vat_total = $2, total = $3, updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING 
      id, reservation_id as "reservationId",
      booking_group_id as "bookingGroupId",
      customer_name as "customerName",
      status, reference1, reference2, currency,
      subtotal, vat_total as "vatTotal", total,
      created_by as "createdBy",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  const rows = await query<Invoice>(updateSql, [
    totals.subtotal,
    totals.vat_total,
    totals.total,
    invoiceId,
  ]);

  if (rows.length === 0) {
    throw new Error(`Invoice ${invoiceId} not found`);
  }
  return rows[0];
}

/**
 * Get invoice lines
 */
export async function getInvoiceLines(invoiceId: string): Promise<InvoiceLine[]> {
  const sql = `
    SELECT 
      id, invoice_id as "invoiceId",
      source_type as "sourceType", source_id as "sourceId",
      reservation_id as "reservationId",
      description, quantity, unit_price as "unitPrice",
      vat_code as "vatCode", vat_amount as "vatAmount",
      line_total as "lineTotal",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM invoice_lines
    WHERE invoice_id = $1
    ORDER BY created_at ASC
  `;
  return await query<InvoiceLine>(sql, [invoiceId]);
}

/**
 * Check if invoice line exists (for idempotency)
 */
export async function invoiceLineExists(
  invoiceId: string,
  sourceType: string,
  sourceId: string
): Promise<boolean> {
  const sql = `
    SELECT COUNT(*) as count
    FROM invoice_lines
    WHERE invoice_id = $1 AND source_type = $2 AND source_id = $3
  `;
  const result = await query<{ count: string }>(sql, [invoiceId, sourceType, sourceId]);
  return parseInt(result[0]?.count || '0', 10) > 0;
}

/**
 * Create invoice line
 */
export async function createInvoiceLine(input: {
  id: string;
  invoiceId: string;
  sourceType: 'ROOM' | 'MEAL' | 'FEE';
  sourceId?: string;
  reservationId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatCode: 'VAT_0' | 'VAT_15' | 'VAT_25';
}): Promise<InvoiceLine> {
  // Calculate VAT and line total
  const vatRate = input.vatCode === 'VAT_15' ? 0.15 : input.vatCode === 'VAT_25' ? 0.25 : 0;
  const lineSubtotal = input.unitPrice * input.quantity;
  const vatAmount = lineSubtotal * vatRate;
  const lineTotal = lineSubtotal + vatAmount;

  const sql = `
    INSERT INTO invoice_lines (
      id, invoice_id, source_type, source_id, reservation_id,
      description, quantity, unit_price, vat_code,
      vat_amount, line_total, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (invoice_id, source_type, source_id) DO NOTHING
    RETURNING 
      id, invoice_id as "invoiceId",
      source_type as "sourceType", source_id as "sourceId",
      reservation_id as "reservationId",
      description, quantity, unit_price as "unitPrice",
      vat_code as "vatCode", vat_amount as "vatAmount",
      line_total as "lineTotal",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  const rows = await query<InvoiceLine & { reservationId?: string }>(sql, [
    input.id,
    input.invoiceId,
    input.sourceType,
    input.sourceId || null,
    input.reservationId || null,
    input.description,
    input.quantity,
    input.unitPrice,
    input.vatCode,
    vatAmount,
    lineTotal,
  ]);

  if (rows.length === 0) {
    // Line already exists (idempotency)
    throw new Error('Invoice line already exists (idempotent)');
  }

  return rows[0];
}

/**
 * Delete invoice line
 */
export async function deleteInvoiceLine(lineId: string): Promise<void> {
  const sql = `DELETE FROM invoice_lines WHERE id = $1`;
  await query(sql, [lineId]);
}

/**
 * Get payments by invoice
 */
export async function getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
  const sql = `
    SELECT 
      id, invoice_id as "invoiceId",
      method, status, amount, currency,
      external_ref as "externalRef",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM payments
    WHERE invoice_id = $1
    ORDER BY created_at DESC
  `;
  return await query<Payment>(sql, [invoiceId]);
}

/**
 * Create payment
 */
export async function createPayment(input: {
  id: string;
  invoiceId: string;
  method: 'PAYMENT_LINK' | 'NETS_TERMINAL';
  amount: number;
  currency?: string;
  externalRef?: string;
}): Promise<Payment> {
  const sql = `
    INSERT INTO payments (
      id, invoice_id, method, status, amount, currency, external_ref,
      created_at, updated_at
    )
    VALUES ($1, $2, $3, 'PENDING', $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING 
      id, invoice_id as "invoiceId",
      method, status, amount, currency,
      external_ref as "externalRef",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  const rows = await query<Payment>(sql, [
    input.id,
    input.invoiceId,
    input.method,
    input.amount,
    input.currency || 'NOK',
    input.externalRef || null,
  ]);

  return rows[0];
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  paymentId: string,
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
): Promise<Payment> {
  const sql = `
    UPDATE payments
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING 
      id, invoice_id as "invoiceId",
      method, status, amount, currency,
      external_ref as "externalRef",
      created_at as "createdAt", updated_at as "updatedAt"
  `;

  const rows = await query<Payment>(sql, [status, paymentId]);
  if (rows.length === 0) {
    throw new Error(`Payment ${paymentId} not found`);
  }
  return rows[0];
}

