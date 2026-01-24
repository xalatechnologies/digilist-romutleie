/**
 * Billing Controller
 * Handles invoice and payment endpoints
 */

import { Request, Response } from 'express';
import { billingService } from '../services/billingService';
import { groupBillingService, CreateInvoiceFromGroupInput } from '../services/groupBillingService';
import {
  InvoiceCreateFromReservationInput,
  InvoiceUpdateInput,
  FeeLineInput,
  PaymentLinkInput,
  NetsTerminalInput,
} from '../models/billing';
import { requireRole, UserRole } from '../middleware/rbac';
import { billingExportService } from '../services/billingExportService';

/**
 * POST /billing/invoices/from-reservation/:reservationId
 * Create invoice from reservation
 * Required role: FINANCE or BOOKING_STAFF
 */
export async function createInvoiceFromReservation(req: Request, res: Response): Promise<void> {
  try {
    const reservationId = req.params.reservationId;
    const input: InvoiceCreateFromReservationInput = req.body;

    if (!input.customerName || !input.reference1 || !input.reference2) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'customerName, reference1, and reference2 are required',
      });
      return;
    }

    const invoice = await billingService.createInvoiceFromReservation(req, reservationId, input);
    res.status(201).json(invoice);
  } catch (error: any) {
    console.error('Error creating invoice from reservation:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      error: 'Failed to create invoice',
      message: error.message,
    });
  }
}

/**
 * GET /billing/invoices/:id
 * Get invoice detail with lines and payments
 * Required role: FINANCE or ADMIN (or BOOKING_STAFF if linked to their reservation - not implemented yet)
 */
export async function getInvoice(req: Request, res: Response): Promise<void> {
  try {
    const invoiceId = req.params.id;
    const detail = await billingService.getInvoiceDetail(invoiceId);
    res.json(detail);
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: 'Failed to fetch invoice',
      message: error.message,
    });
  }
}

/**
 * PATCH /billing/invoices/:id
 * Update invoice (references only, DRAFT only)
 * Required role: FINANCE or ADMIN
 */
export async function updateInvoice(req: Request, res: Response): Promise<void> {
  try {
    const invoiceId = req.params.id;
    const input: InvoiceUpdateInput = req.body;

    const invoice = await billingService.updateInvoice(req, invoiceId, input);
    res.json(invoice);
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('Cannot update') ? 400 : 500;
    res.status(statusCode).json({
      error: 'Failed to update invoice',
      message: error.message,
    });
  }
}

/**
 * POST /billing/invoices/:id/fee-line
 * Add fee line to invoice
 * Required role: FINANCE or ADMIN
 */
export async function addFeeLine(req: Request, res: Response): Promise<void> {
  try {
    const invoiceId = req.params.id;
    const input: FeeLineInput = req.body;

    if (!input.description || !input.quantity || !input.unitPrice || !input.vatCode) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'description, quantity, unitPrice, and vatCode are required',
      });
      return;
    }

    const line = await billingService.addFeeLine(req, invoiceId, input);
    res.status(201).json(line);
  } catch (error: any) {
    console.error('Error adding fee line:', error);
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('Cannot add') ? 400 : 500;
    res.status(statusCode).json({
      error: 'Failed to add fee line',
      message: error.message,
    });
  }
}

/**
 * DELETE /billing/invoices/:id/lines/:lineId
 * Remove invoice line
 * Required role: FINANCE or ADMIN
 */
export async function removeInvoiceLine(req: Request, res: Response): Promise<void> {
  try {
    const lineId = req.params.lineId;
    await billingService.removeInvoiceLine(req, lineId);
    res.json({ success: true, message: 'Invoice line removed' });
  } catch (error: any) {
    console.error('Error removing invoice line:', error);
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('Cannot remove') ? 400 : 500;
    res.status(statusCode).json({
      error: 'Failed to remove invoice line',
      message: error.message,
    });
  }
}

/**
 * POST /billing/invoices/:id/mark-sent
 * Mark invoice as SENT
 * Required role: FINANCE or ADMIN
 */
export async function markInvoiceSent(req: Request, res: Response): Promise<void> {
  try {
    const invoiceId = req.params.id;
    const invoice = await billingService.markInvoiceSent(req, invoiceId);
    res.json(invoice);
  } catch (error: any) {
    console.error('Error marking invoice as sent:', error);
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('Cannot send') ? 400 : 500;
    res.status(statusCode).json({
      error: 'Failed to mark invoice as sent',
      message: error.message,
    });
  }
}

/**
 * POST /billing/invoices/:id/mark-paid
 * Mark invoice as PAID
 * Required role: FINANCE or ADMIN
 */
export async function markInvoicePaid(req: Request, res: Response): Promise<void> {
  try {
    const invoiceId = req.params.id;
    const invoice = await billingService.markInvoicePaid(req, invoiceId);
    res.json(invoice);
  } catch (error: any) {
    console.error('Error marking invoice as paid:', error);
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('Cannot mark') ? 400 : 500;
    res.status(statusCode).json({
      error: 'Failed to mark invoice as paid',
      message: error.message,
    });
  }
}

/**
 * POST /billing/invoices/:id/void
 * Void invoice
 * Required role: FINANCE or ADMIN
 */
export async function voidInvoice(req: Request, res: Response): Promise<void> {
  try {
    const invoiceId = req.params.id;
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({
        error: 'Missing required field',
        message: 'reason is required',
      });
      return;
    }

    const invoice = await billingService.voidInvoice(req, invoiceId, reason);
    res.json(invoice);
  } catch (error: any) {
    console.error('Error voiding invoice:', error);
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('Cannot void') ? 400 : 500;
    res.status(statusCode).json({
      error: 'Failed to void invoice',
      message: error.message,
    });
  }
}

/**
 * POST /billing/invoices/:id/payment-link
 * Create payment link
 * Required role: FINANCE or ADMIN
 */
export async function createPaymentLink(req: Request, res: Response): Promise<void> {
  try {
    const invoiceId = req.params.id;
    const input: PaymentLinkInput = req.body;

    const payment = await billingService.createPaymentLink(req, invoiceId, input);
    res.status(201).json(payment);
  } catch (error: any) {
    console.error('Error creating payment link:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: 'Failed to create payment link',
      message: error.message,
    });
  }
}

/**
 * POST /billing/invoices/:id/nets-terminal/initiate
 * Initiate NETS terminal payment
 * Required role: FINANCE or ADMIN
 */
export async function initiateNetsTerminal(req: Request, res: Response): Promise<void> {
  try {
    const invoiceId = req.params.id;
    const input: NetsTerminalInput = req.body;

    const payment = await billingService.initiateNetsTerminal(req, invoiceId, input);
    res.status(201).json(payment);
  } catch (error: any) {
    console.error('Error initiating NETS terminal payment:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: 'Failed to initiate NETS terminal payment',
      message: error.message,
    });
  }
}

/**
 * POST /billing/invoices/:id/export/visma
 * Queue Visma export for invoice
 * Required role: FINANCE or ADMIN
 */
export async function queueVismaExport(req: Request, res: Response): Promise<void> {
  try {
    const invoiceId = req.params.id;
    const exportRecord = await billingExportService.queueVismaExport(req, invoiceId);
    res.status(201).json(exportRecord);
  } catch (error: any) {
    console.error('Error queueing Visma export:', error);
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('required') ? 400 : 500;
    res.status(statusCode).json({
      error: 'Failed to queue Visma export',
      message: error.message,
    });
  }
}

/**
 * POST /billing/invoices/:id/export/visma/retry
 * Retry Visma export
 * Required role: FINANCE or ADMIN
 */
export async function retryVismaExport(req: Request, res: Response): Promise<void> {
  try {
    const invoiceId = req.params.id;
    const exportRecord = await billingExportService.retryVismaExport(req, invoiceId);
    res.json(exportRecord);
  } catch (error: any) {
    console.error('Error retrying Visma export:', error);
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('required') ? 400 : 500;
    res.status(statusCode).json({
      error: 'Failed to retry Visma export',
      message: error.message,
    });
  }
}

/**
 * GET /billing/invoices/:id/exports
 * Get export status for invoice
 * Required role: FINANCE or ADMIN
 */
export async function getInvoiceExports(req: Request, res: Response): Promise<void> {
  try {
    const invoiceId = req.params.id;
    const exports = await billingExportService.getExportStatus(invoiceId);
    res.json({ exports });
  } catch (error: any) {
    console.error('Error fetching invoice exports:', error);
    res.status(500).json({
      error: 'Failed to fetch invoice exports',
      message: error.message,
    });
  }
}

/**
 * GET /billing/groups
 * Get booking groups suitable for invoicing
 * Required role: FINANCE or ADMIN
 */
export async function getGroupsForInvoicing(req: Request, res: Response): Promise<void> {
  try {
    const { from, to, q } = req.query;
    const groups = await groupBillingService.getGroupsForInvoicing({
      from: from as string | undefined,
      to: to as string | undefined,
      q: q as string | undefined,
    });
    res.json({ groups });
  } catch (error: any) {
    console.error('Error fetching groups for invoicing:', error);
    res.status(500).json({
      error: 'Failed to fetch groups',
      message: error.message,
    });
  }
}

/**
 * GET /billing/groups/:groupId/preview
 * Get preview of invoice that would be created from group
 * Required role: FINANCE or ADMIN
 */
export async function getGroupInvoicePreview(req: Request, res: Response): Promise<void> {
  try {
    const groupId = req.params.groupId;
    const { nightlyRate } = req.query;

    if (!nightlyRate || isNaN(Number(nightlyRate))) {
      res.status(400).json({
        error: 'Missing required parameter',
        message: 'nightlyRate query parameter is required and must be a number',
      });
      return;
    }

    const preview = await groupBillingService.getGroupInvoicePreview(
      req,
      groupId,
      Number(nightlyRate)
    );
    res.json(preview);
  } catch (error: any) {
    console.error('Error fetching group invoice preview:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: 'Failed to fetch preview',
      message: error.message,
    });
  }
}

/**
 * POST /billing/invoices/from-group/:groupId
 * Create invoice from booking group
 * Required role: FINANCE or ADMIN
 */
export async function createInvoiceFromGroup(req: Request, res: Response): Promise<void> {
  try {
    const groupId = req.params.groupId;
    const input: CreateInvoiceFromGroupInput = req.body;

    if (!input.reference1 || !input.reference2 || !input.nightlyRate) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'reference1, reference2, and nightlyRate are required',
      });
      return;
    }

    const invoice = await groupBillingService.createInvoiceFromGroup(req, groupId, input);
    res.status(201).json(invoice);
  } catch (error: any) {
    console.error('Error creating invoice from group:', error);
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('Cannot create') ? 400 : 500;
    res.status(statusCode).json({
      error: 'Failed to create invoice from group',
      message: error.message,
    });
  }
}

// Export middleware for route protection
export const requireFinance = requireRole([UserRole.FINANCE, UserRole.ADMIN]);
export const requireFinanceOrBookingStaff = requireRole([UserRole.FINANCE, UserRole.BOOKING_STAFF, UserRole.ADMIN]);

