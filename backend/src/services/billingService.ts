/**
 * Billing Service
 * Handles invoice generation, line items, and payments with audit logging
 */

import { Request } from 'express';
import { randomUUID } from 'crypto';
import { auditService } from './auditService';
import {
  getInvoiceById,
  getInvoiceByReservationId,
  createInvoice,
  updateInvoice,
  recalculateInvoiceTotals,
  getInvoiceLines,
  invoiceLineExists,
  createInvoiceLine,
  deleteInvoiceLine,
  getPaymentsByInvoice,
  createPayment,
  updatePaymentStatus,
} from '../db/billingQueries';
import { query } from '../db/connection';
import { query } from '../db/connection';
import {
  Invoice,
  InvoiceLine,
  Payment,
  InvoiceCreateFromReservationInput,
  InvoiceUpdateInput,
  FeeLineInput,
  PaymentLinkInput,
  NetsTerminalInput,
} from '../models/billing';
import { getRequestContext } from '../middleware/requestContext';

export class BillingService {
  /**
   * Create invoice from reservation (idempotent)
   * If invoice already exists for reservation, returns existing invoice
   * Otherwise creates new invoice with room and meal lines
   */
  async createInvoiceFromReservation(
    req: Request,
    reservationId: string,
    input: InvoiceCreateFromReservationInput
  ): Promise<Invoice> {
    const context = getRequestContext(req);

    // Check if invoice already exists for this reservation
    const existing = await getInvoiceByReservationId(reservationId);
    if (existing) {
      // Return existing invoice (idempotent behavior)
      return existing;
    }

    // Get reservation details
    const reservationRows = await query<{
      id: string;
      roomId: string;
      startDate: Date;
      endDate: Date;
      customerName?: string;
    }>(
      `SELECT id, room_id as "roomId", start_date as "startDate", 
              end_date as "endDate", customer_name as "customerName"
       FROM reservations WHERE id = $1`,
      [reservationId]
    );
    const reservation = reservationRows[0];

    if (!reservation) {
      throw new Error(`Reservation ${reservationId} not found`);
    }

    // Calculate nights
    const start = new Date(reservation.startDate);
    const end = new Date(reservation.endDate);
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Create invoice
    const invoiceId = randomUUID();
    const invoice = await createInvoice({
      id: invoiceId,
      reservationId,
      customerName: input.customerName || reservation.customerName || 'Guest',
      reference1: input.reference1,
      reference2: input.reference2,
      createdBy: context.userId || undefined,
    });

    // Add ROOM line
    const nightlyRate = input.nightlyRate || 0; // Default to 0 if not provided (finance must edit)
    const roomLineId = randomUUID();
    
    try {
      await createInvoiceLine({
        id: roomLineId,
        invoiceId,
        sourceType: 'ROOM',
        sourceId: reservationId,
        description: `Room stay (${nights} night${nights !== 1 ? 's' : ''})`,
        quantity: nights,
        unitPrice: nightlyRate,
        vatCode: 'VAT_15', // Assumption: Room VAT is 15%
      });
    } catch (error: any) {
      // Ignore if line already exists (shouldn't happen on first create, but safe)
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }

    // Add MEAL lines (from meal_orders)
    const mealOrders = await query<{
      id: string;
      kitchenItemId: string;
      quantity: number;
      orderDateTime: Date;
    }>(
      `SELECT mo.id, mo.kitchen_item_id as "kitchenItemId",
              mo.quantity, mo.order_datetime as "orderDateTime"
       FROM meal_orders mo
       WHERE mo.reservation_id = $1 AND mo.status != 'CANCELLED'`,
      [reservationId]
    );

    for (const mealOrder of mealOrders) {
      // Get kitchen item details
      const itemRows = await query<{
        name: string;
        unitPrice: number;
        vatCode: string;
      }>(
        `SELECT name, unit_price as "unitPrice", vat_code as "vatCode"
         FROM kitchen_items WHERE id = $1`,
        [mealOrder.kitchenItemId]
      );
      const item = itemRows[0];

      if (item) {
        const mealLineId = randomUUID();
        try {
          await createInvoiceLine({
            id: mealLineId,
            invoiceId,
            sourceType: 'MEAL',
            sourceId: mealOrder.id,
            description: `${item.name} × ${mealOrder.quantity}`,
            quantity: mealOrder.quantity,
            unitPrice: item.unitPrice,
            vatCode: item.vatCode === 'VAT_15' ? 'VAT_15' : 'VAT_25',
          });
        } catch (error: any) {
          // Ignore if line already exists (idempotency)
          if (!error.message.includes('already exists')) {
            throw error;
          }
        }
      }
    }

    // Recalculate totals
    const updatedInvoice = await recalculateInvoiceTotals(invoiceId);

    // Audit log
    await auditService.log(req, {
      action: 'INVOICE_CREATED_FROM_RESERVATION',
      entityType: 'INVOICE',
      entityId: invoiceId,
      message: `Invoice created from reservation ${reservationId} (${nights} nights, ${mealOrders.length} meal orders)`,
      after: {
        reservationId,
        customerName: updatedInvoice.customerName,
        subtotal: updatedInvoice.subtotal,
        vatTotal: updatedInvoice.vatTotal,
        total: updatedInvoice.total,
      },
      metadata: {
        reservationId,
        nightlyRate,
        mealOrderCount: mealOrders.length,
      },
    });

    return updatedInvoice;
  }

  /**
   * Get invoice with lines and payments
   */
  async getInvoiceDetail(invoiceId: string): Promise<{
    invoice: Invoice;
    lines: InvoiceLine[];
    payments: Payment[];
  }> {
    const invoice = await getInvoiceById(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    const lines = await getInvoiceLines(invoiceId);
    const payments = await getPaymentsByInvoice(invoiceId);

    return { invoice, lines, payments };
  }

  /**
   * Update invoice (references only in DRAFT)
   */
  async updateInvoice(req: Request, invoiceId: string, input: InvoiceUpdateInput): Promise<Invoice> {
    const current = await getInvoiceById(invoiceId);
    if (!current) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    if (current.status !== 'DRAFT') {
      throw new Error(`Cannot update invoice ${invoiceId}: invoice is ${current.status}, only DRAFT invoices can be updated`);
    }

    const updated = await updateInvoice(invoiceId, input);

    // Audit log
    if (input.reference1 !== undefined || input.reference2 !== undefined) {
      await auditService.logChange(req, {
        entityType: 'INVOICE',
        entityId: invoiceId,
        action: 'INVOICE_REFERENCE_UPDATED',
        before: {
          reference1: current.reference1,
          reference2: current.reference2,
        },
        after: {
          reference1: updated.reference1,
          reference2: updated.reference2,
        },
        message: `Invoice references updated: ref1="${updated.reference1}", ref2="${updated.reference2}"`,
      });
    }

    return updated;
  }

  /**
   * Add fee line to invoice
   */
  async addFeeLine(req: Request, invoiceId: string, input: FeeLineInput): Promise<InvoiceLine> {
    const invoice = await getInvoiceById(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    if (invoice.status !== 'DRAFT') {
      throw new Error(`Cannot add line to invoice ${invoiceId}: invoice is ${invoice.status}, only DRAFT invoices can be modified`);
    }

    const lineId = randomUUID();
    const line = await createInvoiceLine({
      id: lineId,
      invoiceId,
      sourceType: 'FEE',
      sourceId: undefined, // FEE lines don't have source_id
      description: input.description,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      vatCode: input.vatCode,
    });

    // Recalculate totals
    await recalculateInvoiceTotals(invoiceId);

    // Audit log
    await auditService.log(req, {
      action: 'INVOICE_LINE_ADDED',
      entityType: 'INVOICE_LINE',
      entityId: lineId,
      message: `Fee line added to invoice ${invoiceId}: ${input.description} (${input.quantity} × ${input.unitPrice} NOK, VAT ${input.vatCode})`,
      after: {
        invoiceId,
        sourceType: 'FEE',
        description: input.description,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        vatCode: input.vatCode,
      },
    });

    return line;
  }

  /**
   * Delete invoice line
   */
  async removeInvoiceLine(req: Request, lineId: string): Promise<void> {
    // Get line to find invoice
    const lineRows = await query<{ invoiceId: string; description: string }>(
      `SELECT invoice_id as "invoiceId", description FROM invoice_lines WHERE id = $1`,
      [lineId]
    );
    const line = lineRows[0];

    if (!line) {
      throw new Error(`Invoice line ${lineId} not found`);
    }

    const invoice = await getInvoiceById(line.invoiceId);
    if (invoice && invoice.status !== 'DRAFT') {
      throw new Error(`Cannot remove line from invoice ${line.invoiceId}: invoice is ${invoice.status}, only DRAFT invoices can be modified`);
    }

    await deleteInvoiceLine(lineId);

    // Recalculate totals
    await recalculateInvoiceTotals(line.invoiceId);

    // Audit log
    await auditService.log(req, {
      action: 'INVOICE_LINE_REMOVED',
      entityType: 'INVOICE_LINE',
      entityId: lineId,
      message: `Invoice line removed from invoice ${line.invoiceId}: ${line.description}`,
      before: {
        invoiceId: line.invoiceId,
        lineId,
      },
    });
  }

  /**
   * Mark invoice as SENT
   */
  async markInvoiceSent(req: Request, invoiceId: string): Promise<Invoice> {
    const current = await getInvoiceById(invoiceId);
    if (!current) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    if (current.status !== 'DRAFT') {
      throw new Error(`Cannot send invoice ${invoiceId}: invoice is ${current.status}, only DRAFT invoices can be sent`);
    }

    const updated = await updateInvoice(invoiceId, { status: 'SENT' });

    // Audit log
    await auditService.logChange(req, {
      entityType: 'INVOICE',
      entityId: invoiceId,
      action: 'INVOICE_STATUS_CHANGED',
      before: { status: current.status },
      after: { status: updated.status },
      message: `Invoice status changed: ${current.status} → ${updated.status}`,
    });

    return updated;
  }

  /**
   * Mark invoice as PAID
   */
  async markInvoicePaid(req: Request, invoiceId: string): Promise<Invoice> {
    const current = await getInvoiceById(invoiceId);
    if (!current) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    if (current.status === 'VOID') {
      throw new Error(`Cannot mark invoice ${invoiceId} as paid: invoice is VOID`);
    }

    const updated = await updateInvoice(invoiceId, { status: 'PAID' });

    // Audit log
    await auditService.logChange(req, {
      entityType: 'INVOICE',
      entityId: invoiceId,
      action: 'INVOICE_STATUS_CHANGED',
      before: { status: current.status },
      after: { status: updated.status },
      message: `Invoice status changed: ${current.status} → ${updated.status}`,
    });

    return updated;
  }

  /**
   * Void invoice
   */
  async voidInvoice(req: Request, invoiceId: string, reason: string): Promise<Invoice> {
    const current = await getInvoiceById(invoiceId);
    if (!current) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    if (current.status === 'PAID') {
      throw new Error(`Cannot void invoice ${invoiceId}: invoice is already PAID`);
    }

    const updated = await updateInvoice(invoiceId, { status: 'VOID' });

    // Audit log
    await auditService.logChange(req, {
      entityType: 'INVOICE',
      entityId: invoiceId,
      action: 'INVOICE_STATUS_CHANGED',
      before: { status: current.status },
      after: { status: updated.status },
      message: `Invoice voided: ${reason}`,
      metadata: { reason },
    });

    return updated;
  }

  /**
   * Create payment link
   */
  async createPaymentLink(req: Request, invoiceId: string, input: PaymentLinkInput): Promise<Payment> {
    const invoice = await getInvoiceById(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    const amount = input.amount || invoice.total;
    const paymentId = randomUUID();
    
    // Generate stub payment link ID
    const externalRef = `paylink-${paymentId.substring(0, 8)}`;

    const payment = await createPayment({
      id: paymentId,
      invoiceId,
      method: 'PAYMENT_LINK',
      amount,
      externalRef,
    });

    // Audit log
    await auditService.log(req, {
      action: 'PAYMENT_CREATED',
      entityType: 'PAYMENT',
      entityId: paymentId,
      message: `Payment link created for invoice ${invoiceId} (amount: ${amount} NOK)`,
      after: {
        invoiceId,
        method: 'PAYMENT_LINK',
        amount,
        status: 'PENDING',
        externalRef,
      },
    });

    return payment;
  }

  /**
   * Initiate NETS terminal payment
   */
  async initiateNetsTerminal(req: Request, invoiceId: string, input: NetsTerminalInput): Promise<Payment> {
    const invoice = await getInvoiceById(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    const amount = input.amount || invoice.total;
    const paymentId = randomUUID();
    
    // Generate stub transaction ID
    const externalRef = `nets-${paymentId.substring(0, 8)}`;

    const payment = await createPayment({
      id: paymentId,
      invoiceId,
      method: 'NETS_TERMINAL',
      amount,
      externalRef,
    });

    // Audit log
    await auditService.log(req, {
      action: 'PAYMENT_CREATED',
      entityType: 'PAYMENT',
      entityId: paymentId,
      message: `NETS terminal payment initiated for invoice ${invoiceId} (amount: ${amount} NOK)`,
      after: {
        invoiceId,
        method: 'NETS_TERMINAL',
        amount,
        status: 'PENDING',
        externalRef,
      },
    });

    return payment;
  }
}

export const billingService = new BillingService();

