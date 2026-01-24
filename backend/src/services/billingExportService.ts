/**
 * Billing Export Service
 * Handles Visma export operations
 */

import { Request } from 'express';
import { randomUUID } from 'crypto';
import { auditService } from './auditService';
import { getInvoiceById, getInvoiceLines } from '../db/billingQueries';
import {
  getAccountingExportByInvoiceId,
  upsertAccountingExport,
  getAccountingExportsByInvoiceId,
} from '../db/outboxQueries';
import { outboxService } from './outboxService';
import { vismaAdapter } from '../adapters/vismaAdapter';
import { AccountingExport } from '../models/outbox';
import { getRequestContext } from '../middleware/requestContext';

export class BillingExportService {
  /**
   * Queue Visma export for invoice
   */
  async queueVismaExport(req: Request, invoiceId: string): Promise<AccountingExport> {
    const context = getRequestContext(req);

    // Get invoice
    const invoice = await getInvoiceById(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    // Validate references
    if (!invoice.reference1 || !invoice.reference2) {
      throw new Error(
        `Cannot export invoice ${invoiceId}: reference1 and reference2 are required`
      );
    }

    // Get lines
    const lines = await getInvoiceLines(invoiceId);
    if (lines.length === 0) {
      throw new Error(`Cannot export invoice ${invoiceId}: invoice has no lines`);
    }

    // Build Visma payload
    const vismaPayload = vismaAdapter.buildPayload(invoice, lines);

    // Create or update accounting export
    const exportId = randomUUID();
    const accountingExport = await upsertAccountingExport({
      id: exportId,
      invoiceId,
      targetSystem: 'VISMA',
      status: 'PENDING',
    });

    // Enqueue outbox event
    await outboxService.enqueue(
      'VISMA_EXPORT_INVOICE',
      'INVOICE',
      invoiceId,
      vismaPayload
    );

    // Audit log
    await auditService.log(req, {
      action: 'VISMA_EXPORT_QUEUED',
      entityType: 'INVOICE',
      entityId: invoiceId,
      message: `Visma export queued for invoice ${invoiceId}`,
      after: {
        exportId,
        status: 'PENDING',
      },
    });

    return accountingExport;
  }

  /**
   * Retry Visma export
   */
  async retryVismaExport(req: Request, invoiceId: string): Promise<AccountingExport> {
    const context = getRequestContext(req);

    // Get existing export
    const existing = await getAccountingExportByInvoiceId(invoiceId, 'VISMA');
    if (!existing) {
      throw new Error(`No export found for invoice ${invoiceId}`);
    }

    // Get invoice
    const invoice = await getInvoiceById(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    // Validate references
    if (!invoice.reference1 || !invoice.reference2) {
      throw new Error(
        `Cannot export invoice ${invoiceId}: reference1 and reference2 are required`
      );
    }

    // Get lines
    const lines = await getInvoiceLines(invoiceId);
    if (lines.length === 0) {
      throw new Error(`Cannot export invoice ${invoiceId}: invoice has no lines`);
    }

    // Build Visma payload
    const vismaPayload = vismaAdapter.buildPayload(invoice, lines);

    // Reset export status
    const accountingExport = await upsertAccountingExport({
      id: existing.id,
      invoiceId,
      targetSystem: 'VISMA',
      status: 'PENDING',
      lastError: undefined, // Clear previous error
    });

    // Enqueue new outbox event
    await outboxService.enqueue(
      'VISMA_EXPORT_INVOICE',
      'INVOICE',
      invoiceId,
      vismaPayload
    );

    // Audit log
    await auditService.log(req, {
      action: 'VISMA_EXPORT_QUEUED',
      entityType: 'INVOICE',
      entityId: invoiceId,
      message: `Visma export retry queued for invoice ${invoiceId}`,
      after: {
        exportId: existing.id,
        status: 'PENDING',
        retry: true,
      },
    });

    return accountingExport;
  }

  /**
   * Get export status for invoice
   */
  async getExportStatus(invoiceId: string): Promise<AccountingExport[]> {
    return await getAccountingExportsByInvoiceId(invoiceId);
  }
}

export const billingExportService = new BillingExportService();

