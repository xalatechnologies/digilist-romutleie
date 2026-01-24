/**
 * Group Billing Service
 * Handles invoice generation from booking groups with preview and idempotency
 */

import { Request } from 'express';
import { randomUUID } from 'crypto';
import { auditService } from './auditService';
import {
  getGroupsForInvoicing,
  getBookingGroupById,
  getInvoiceByBookingGroupId,
} from '../db/groupBillingQueries';
import {
  createInvoice,
  recalculateInvoiceTotals,
  createInvoiceLine,
  invoiceLineExists,
} from '../db/billingQueries';
import { query } from '../db/connection';
import { Invoice, InvoiceLine } from '../models/billing';
import { getRequestContext } from '../middleware/requestContext';

export interface GroupInvoicePreview {
  group: {
    id: string;
    customerName: string;
    reference1?: string;
    reference2?: string;
    title?: string;
  };
  reservations: {
    included: Array<{
      id: string;
      roomId: string;
      roomNumber: string;
      startDate: Date;
      endDate: Date;
      customerName?: string;
      nights: number;
    }>;
    excluded: Array<{
      id: string;
      reason: string;
    }>;
  };
  mealOrders: Array<{
    id: string;
    reservationId?: string;
    kitchenItemName: string;
    quantity: number;
    unitPrice: number;
    vatCode: string;
    orderDateTime: Date;
  }>;
  linesPreview: Array<{
    type: 'ROOM' | 'MEAL';
    sourceId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    vatCode: string;
    lineTotal: number;
  }>;
  totals: {
    subtotal: number;
    vatTotal: number;
    total: number;
  };
  validation: {
    mixedCustomers: boolean;
    missingReferences: boolean;
    existingInvoiceId?: string;
  };
}

export interface CreateInvoiceFromGroupInput {
  reference1: string;
  reference2: string;
  nightlyRate: number; // Required until pricing model exists
}

export class GroupBillingService {
  /**
   * Get groups suitable for invoicing
   */
  async getGroupsForInvoicing(filters?: {
    from?: string;
    to?: string;
    q?: string;
  }) {
    return await getGroupsForInvoicing(filters);
  }

  /**
   * Get preview of invoice that would be created from group
   */
  async getGroupInvoicePreview(
    req: Request,
    groupId: string,
    nightlyRate: number
  ): Promise<GroupInvoicePreview> {
    const group = await getBookingGroupById(groupId);
    if (!group) {
      throw new Error(`Booking group ${groupId} not found`);
    }

    // Check if invoice already exists
    const existingInvoice = await getInvoiceByBookingGroupId(groupId);

    // Get reservations in group (only active statuses)
    const reservationRows = await query<{
      id: string;
      roomId: string;
      roomNumber: string;
      startDate: Date;
      endDate: Date;
      status: string;
      customerName?: string;
    }>(
      `SELECT 
        r.id, r.room_id as "roomId", r.start_date as "startDate",
        r.end_date as "endDate", r.status, r.customer_name as "customerName",
        ro.number as "roomNumber"
      FROM reservations r
      JOIN rooms ro ON r.room_id = ro.id
      WHERE r.booking_group_id = $1
      ORDER BY r.start_date ASC`,
      [groupId]
    );

    // Separate included and excluded reservations
    const included: GroupInvoicePreview['reservations']['included'] = [];
    const excluded: GroupInvoicePreview['reservations']['excluded'] = [];

    for (const res of reservationRows) {
      if (res.status === 'CANCELLED') {
        excluded.push({ id: res.id, reason: 'Reservation is cancelled' });
        continue;
      }

      // Check if already invoiced
      const hasInvoice = await query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM invoices
         WHERE reservation_id = $1 AND status != 'VOID'`,
        [res.id]
      );
      if (parseInt(hasInvoice[0]?.count || '0', 10) > 0) {
        excluded.push({ id: res.id, reason: 'Reservation already has an invoice' });
        continue;
      }

      // Calculate nights
      const start = new Date(res.startDate);
      const end = new Date(res.endDate);
      const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      included.push({
        id: res.id,
        roomId: res.roomId,
        roomNumber: res.roomNumber,
        startDate: res.startDate,
        endDate: res.endDate,
        customerName: res.customerName,
        nights,
      });
    }

    // Check for mixed customers
    const customerNames = new Set(
      included.map((r) => r.customerName || group.customerName).filter(Boolean)
    );
    const mixedCustomers = customerNames.size > 1;

    // Get meal orders for included reservations
    const mealOrderRows = await query<{
      id: string;
      reservationId?: string;
      kitchenItemId: string;
      quantity: number;
      unitPrice: number;
      vatCode: string;
      orderDateTime: Date;
      kitchenItemName: string;
    }>(
      `SELECT 
        mo.id, mo.reservation_id as "reservationId",
        mo.kitchen_item_id as "kitchenItemId", mo.quantity,
        mo.order_datetime as "orderDateTime",
        ki.name as "kitchenItemName", ki.unit_price as "unitPrice", ki.vat_code as "vatCode"
      FROM meal_orders mo
      JOIN kitchen_items ki ON mo.kitchen_item_id = ki.id
      WHERE mo.booking_group_id = $1
        AND mo.status != 'CANCELLED'
        AND (mo.reservation_id IS NULL OR mo.reservation_id = ANY($2::text[]))
      ORDER BY mo.order_datetime ASC`,
      [groupId, included.map((r) => r.id)]
    );

    const mealOrders: GroupInvoicePreview['mealOrders'] = mealOrderRows.map((mo) => ({
      id: mo.id,
      reservationId: mo.reservationId || undefined,
      kitchenItemName: mo.kitchenItemName,
      quantity: mo.quantity,
      unitPrice: mo.unitPrice,
      vatCode: mo.vatCode,
      orderDateTime: mo.orderDateTime,
    }));

    // Build lines preview
    const linesPreview: GroupInvoicePreview['linesPreview'] = [];

    // ROOM lines
    for (const res of included) {
      const lineSubtotal = nightlyRate * res.nights;
      const vatRate = 0.15; // VAT_15 for rooms
      const vatAmount = lineSubtotal * vatRate;
      const lineTotal = lineSubtotal + vatAmount;

      linesPreview.push({
        type: 'ROOM',
        sourceId: res.id,
        description: `Room ${res.roomNumber} (${res.nights} night${res.nights !== 1 ? 's' : ''})`,
        quantity: res.nights,
        unitPrice: nightlyRate,
        vatCode: 'VAT_15',
        lineTotal,
      });
    }

    // MEAL lines
    for (const mealOrder of mealOrders) {
      const lineSubtotal = mealOrder.unitPrice * mealOrder.quantity;
      const vatRate =
        mealOrder.vatCode === 'VAT_15'
          ? 0.15
          : mealOrder.vatCode === 'VAT_25'
          ? 0.25
          : 0;
      const vatAmount = lineSubtotal * vatRate;
      const lineTotal = lineSubtotal + vatAmount;

      linesPreview.push({
        type: 'MEAL',
        sourceId: mealOrder.id,
        description: `${mealOrder.kitchenItemName} × ${mealOrder.quantity}`,
        quantity: mealOrder.quantity,
        unitPrice: mealOrder.unitPrice,
        vatCode: mealOrder.vatCode as 'VAT_0' | 'VAT_15' | 'VAT_25',
        lineTotal,
      });
    }

    // Calculate totals
    const subtotal = linesPreview.reduce((sum, line) => {
      const lineSubtotal = line.unitPrice * line.quantity;
      return sum + lineSubtotal;
    }, 0);

    const vatTotal = linesPreview.reduce((sum, line) => {
      const vatRate =
        line.vatCode === 'VAT_15' ? 0.15 : line.vatCode === 'VAT_25' ? 0.25 : 0;
      return sum + line.unitPrice * line.quantity * vatRate;
    }, 0);

    const total = subtotal + vatTotal;

    return {
      group: {
        id: group.id,
        customerName: group.customerName,
        reference1: group.reference1 || undefined,
        reference2: group.reference2 || undefined,
        title: group.title || undefined,
      },
      reservations: {
        included,
        excluded,
      },
      mealOrders,
      linesPreview,
      totals: {
        subtotal,
        vatTotal,
        total,
      },
      validation: {
        mixedCustomers,
        missingReferences: !group.reference1 || !group.reference2,
        existingInvoiceId: existingInvoice?.id,
      },
    };
  }

  /**
   * Create invoice from booking group (idempotent)
   */
  async createInvoiceFromGroup(
    req: Request,
    groupId: string,
    input: CreateInvoiceFromGroupInput
  ): Promise<Invoice> {
    const context = getRequestContext(req);

    // Check if invoice already exists (idempotency)
    const existingInvoice = await getInvoiceByBookingGroupId(groupId);
    if (existingInvoice) {
      const invoice = await query<Invoice>(
        `SELECT 
          id, reservation_id as "reservationId",
          booking_group_id as "bookingGroupId",
          customer_name as "customerName",
          status, reference1, reference2, currency,
          subtotal, vat_total as "vatTotal", total,
          created_by as "createdBy",
          created_at as "createdAt", updated_at as "updatedAt"
        FROM invoices
        WHERE id = $1`,
        [existingInvoice.id]
      );
      return invoice[0];
    }

    // Get group
    const group = await getBookingGroupById(groupId);
    if (!group) {
      throw new Error(`Booking group ${groupId} not found`);
    }

    // Get preview to validate
    const preview = await this.getGroupInvoicePreview(req, groupId, input.nightlyRate);

    if (preview.validation.mixedCustomers) {
      throw new Error('Cannot create invoice: group contains reservations with different customers');
    }

    if (preview.reservations.included.length === 0) {
      throw new Error('No valid reservations found in group to invoice');
    }

    // Create invoice
    const invoiceId = randomUUID();
    const invoice = await createInvoice({
      id: invoiceId,
      bookingGroupId: groupId,
      customerName: group.customerName,
      reference1: input.reference1,
      reference2: input.reference2,
      createdBy: context.userId || undefined,
    });

    // Create ROOM lines
    for (const res of preview.reservations.included) {
      const lineId = randomUUID();
      try {
        await createInvoiceLine({
          id: lineId,
          invoiceId,
          sourceType: 'ROOM',
          sourceId: res.id,
          reservationId: res.id,
          description: `Room ${res.roomNumber} (${res.nights} night${res.nights !== 1 ? 's' : ''})`,
          quantity: res.nights,
          unitPrice: input.nightlyRate,
          vatCode: 'VAT_15',
        });
      } catch (error: any) {
        // Ignore if line already exists (idempotency)
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }

    // Create MEAL lines
    for (const mealOrder of preview.mealOrders) {
      const lineId = randomUUID();
      try {
        await createInvoiceLine({
          id: lineId,
          invoiceId,
          sourceType: 'MEAL',
          sourceId: mealOrder.id,
          reservationId: mealOrder.reservationId,
          description: `${mealOrder.kitchenItemName} × ${mealOrder.quantity}`,
          quantity: mealOrder.quantity,
          unitPrice: mealOrder.unitPrice,
          vatCode: mealOrder.vatCode as 'VAT_0' | 'VAT_15' | 'VAT_25',
        });
      } catch (error: any) {
        // Ignore if line already exists (idempotency)
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    }

    // Recalculate totals
    const updatedInvoice = await recalculateInvoiceTotals(invoiceId);

    // Audit log
    await auditService.log(req, {
      action: 'INVOICE_CREATED_FROM_GROUP',
      entityType: 'INVOICE',
      entityId: invoiceId,
      message: `Invoice created from group "${group.title || groupId}" (${preview.reservations.included.length} reservations, ${preview.mealOrders.length} meal orders)`,
      after: {
        bookingGroupId: groupId,
        customerName: updatedInvoice.customerName,
        reservationCount: preview.reservations.included.length,
        mealOrderCount: preview.mealOrders.length,
        subtotal: updatedInvoice.subtotal,
        vatTotal: updatedInvoice.vatTotal,
        total: updatedInvoice.total,
      },
      metadata: {
        bookingGroupId: groupId,
        nightlyRate: input.nightlyRate,
        reservationIds: preview.reservations.included.map((r) => r.id),
        mealOrderIds: preview.mealOrders.map((m) => m.id),
      },
    });

    return updatedInvoice;
  }
}

export const groupBillingService = new GroupBillingService();

