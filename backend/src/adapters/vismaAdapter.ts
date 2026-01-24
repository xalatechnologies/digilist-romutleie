/**
 * Visma Adapter (Stub)
 * Simulates Visma export with deterministic success/failure for testing
 */

import { VismaInvoicePayload } from '../models/outbox';

export interface VismaExportResult {
  externalRef: string;
  success: boolean;
  error?: string;
}

export class VismaAdapter {
  /**
   * Export invoice to Visma
   * Stub implementation with deterministic failure for testing
   */
  async exportInvoice(payload: VismaInvoicePayload): Promise<VismaExportResult> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Deterministic failure: if customerName contains "FAIL", throw error
    if (payload.customerName.toUpperCase().includes('FAIL')) {
      throw new Error(`Visma export failed: Customer name contains "FAIL" (test failure)`);
    }

    // Simulate success: generate external reference
    const timestamp = Date.now();
    const externalRef = `VISMA-${payload.invoiceId.substring(0, 8)}-${timestamp}`;

    return {
      externalRef,
      success: true,
    };
  }

  /**
   * Build Visma invoice payload from invoice data
   */
  buildPayload(invoice: {
    id: string;
    customerName: string;
    reference1: string;
    reference2: string;
    currency: string;
    subtotal: number;
    vatTotal: number;
    total: number;
  }, lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatCode: 'VAT_0' | 'VAT_15' | 'VAT_25';
  }>): VismaInvoicePayload {
    return {
      invoiceId: invoice.id,
      customerName: invoice.customerName,
      reference1: invoice.reference1,
      reference2: invoice.reference2,
      lines: lines.map(line => ({
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        vatCode: line.vatCode,
      })),
      totals: {
        subtotal: invoice.subtotal,
        vatTotal: invoice.vatTotal,
        total: invoice.total,
      },
      currency: invoice.currency,
    };
  }
}

export const vismaAdapter = new VismaAdapter();

