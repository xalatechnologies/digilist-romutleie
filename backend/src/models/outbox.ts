/**
 * Outbox Model
 * TypeScript interfaces for integration outbox and accounting exports
 */

export interface OutboxEvent {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  payload: any; // JSONB
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  retryCount: number;
  lastError?: string;
  nextRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountingExport {
  id: string;
  invoiceId: string;
  targetSystem: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CONFIRMED';
  externalRef?: string;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VismaInvoicePayload {
  invoiceId: string;
  customerName: string;
  reference1: string;
  reference2: string;
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatCode: 'VAT_0' | 'VAT_15' | 'VAT_25';
  }>;
  totals: {
    subtotal: number;
    vatTotal: number;
    total: number;
  };
  currency: string;
}

