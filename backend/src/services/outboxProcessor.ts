/**
 * Outbox Processor
 * Processes pending outbox events with retry logic
 */

import { Request } from 'express';
import { auditService } from './auditService';
import {
  getPendingOutboxEvents,
  updateOutboxEventStatus,
  updateAccountingExportStatus,
} from '../db/outboxQueries';
import { vismaAdapter } from '../adapters/vismaAdapter';
import { VismaInvoicePayload } from '../models/outbox';
import { getInvoiceById, getInvoiceLines } from '../db/billingQueries';
import { getRequestContext } from '../middleware/requestContext';

const MAX_RETRIES = 5;
const RETRY_BACKOFF_MS = [
  60 * 1000,    // 1 minute
  5 * 60 * 1000, // 5 minutes
  15 * 60 * 1000, // 15 minutes
  60 * 60 * 1000, // 1 hour
  60 * 60 * 1000, // 1 hour (max)
];

export class OutboxProcessor {
  /**
   * Calculate next retry time based on retry count
   */
  private getNextRetryAt(retryCount: number): Date {
    const backoffIndex = Math.min(retryCount, RETRY_BACKOFF_MS.length - 1);
    const backoffMs = RETRY_BACKOFF_MS[backoffIndex];
    return new Date(Date.now() + backoffMs);
  }

  /**
   * Process a single outbox event
   */
  private async processEvent(event: any, req: Request): Promise<void> {
    const { eventType, entityType, entityId, payload, id } = event;

    // Mark as processing
    await updateOutboxEventStatus(id, 'PROCESSING');

    try {
      // Route to appropriate handler based on event type
      if (eventType === 'VISMA_EXPORT_INVOICE') {
        await this.handleVismaExport(entityId, payload, req);
      } else {
        throw new Error(`Unknown event type: ${eventType}`);
      }

      // Mark as succeeded
      await updateOutboxEventStatus(id, 'SUCCEEDED');

    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      const retryCount = event.retryCount || 0;

      if (retryCount >= MAX_RETRIES) {
        // Terminal failure
        await updateOutboxEventStatus(id, 'FAILED', {
          lastError: errorMessage,
        });

        // Update accounting export status
        if (entityType === 'INVOICE') {
          await updateAccountingExportStatus(entityId, 'VISMA', 'FAILED', {
            lastError: errorMessage,
          });

          // Audit log
          await auditService.log(req, {
            action: 'VISMA_EXPORT_FAILED',
            entityType: 'INVOICE',
            entityId,
            message: `Visma export failed for invoice ${entityId}: ${errorMessage}`,
            metadata: {
              outboxEventId: id,
              retryCount,
              terminal: true,
            },
          });
        }
      } else {
        // Schedule retry
        const nextRetryAt = this.getNextRetryAt(retryCount);
        await updateOutboxEventStatus(id, 'PENDING', {
          lastError: errorMessage,
          nextRetryAt,
          incrementRetry: true,
        });

        // Audit log for retry (system job, no user context)
        try {
          await auditService.log(req, {
            action: 'OUTBOX_EVENT_RETRY',
            entityType: 'OUTBOX',
            entityId: id,
            message: `Visma export retry scheduled for invoice ${entityId} (attempt ${retryCount + 1}/${MAX_RETRIES}): ${errorMessage}`,
            metadata: {
              invoiceId: entityId,
              retryCount: retryCount + 1,
              nextRetryAt: nextRetryAt.toISOString(),
            },
          });
        } catch (auditError) {
          // Log audit error but don't fail the retry
          console.error('Failed to log audit for retry:', auditError);
        }
      }
    }
  }

  /**
   * Handle Visma export event
   */
  private async handleVismaExport(
    invoiceId: string,
    payload: VismaInvoicePayload,
    req: Request
  ): Promise<void> {
    // Get invoice and lines to build full payload
    const invoice = await getInvoiceById(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    const lines = await getInvoiceLines(invoiceId);
    if (lines.length === 0) {
      throw new Error(`Invoice ${invoiceId} has no lines`);
    }

    // Build payload
    const vismaPayload = vismaAdapter.buildPayload(invoice, lines);

    // Export to Visma (stub)
    const result = await vismaAdapter.exportInvoice(vismaPayload);

    if (!result.success) {
      throw new Error(result.error || 'Visma export failed');
    }

    // Update accounting export status
    await updateAccountingExportStatus(invoiceId, 'VISMA', 'SENT', {
      externalRef: result.externalRef,
    });

    // Audit log
    await auditService.log(req, {
      action: 'VISMA_EXPORT_SENT',
      entityType: 'INVOICE',
      entityId: invoiceId,
      message: `Visma export sent for invoice ${invoiceId} (ref: ${result.externalRef})`,
      after: {
        externalRef: result.externalRef,
        status: 'SENT',
      },
      metadata: {
        vismaRef: result.externalRef,
      },
    });
  }

  /**
   * Process all pending outbox events
   */
  async processPending(req?: Request): Promise<number> {
    const systemReq = req || createSystemRequest();
    const events = await getPendingOutboxEvents(10);
    let processed = 0;

    for (const event of events) {
      try {
        await this.processEvent(event, systemReq);
        processed++;
      } catch (error: any) {
        console.error(`Error processing outbox event ${event.id}:`, error);
        // Continue processing other events
      }
    }

    return processed;
  }
}

export const outboxProcessor = new OutboxProcessor();

