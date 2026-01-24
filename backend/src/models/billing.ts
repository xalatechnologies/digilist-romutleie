/**
 * Billing Model
 * TypeScript interfaces for invoices, invoice lines, and payments
 */

export interface Invoice {
  id: string;
  reservationId?: string;
  bookingGroupId?: string;
  customerName: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'VOID';
  reference1: string;
  reference2: string;
  currency: string;
  subtotal: number;
  vatTotal: number;
  total: number;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  sourceType: 'ROOM' | 'MEAL' | 'FEE';
  sourceId?: string;
  reservationId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatCode: 'VAT_0' | 'VAT_15' | 'VAT_25';
  vatAmount: number;
  lineTotal: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  invoiceId: string;
  method: 'PAYMENT_LINK' | 'NETS_TERMINAL';
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  amount: number;
  currency: string;
  externalRef?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceCreateFromReservationInput {
  customerName: string;
  reference1: string;
  reference2: string;
  nightlyRate?: number; // Optional: if not provided, defaults to 0 (finance must edit)
}

export interface InvoiceUpdateInput {
  reference1?: string;
  reference2?: string;
}

export interface FeeLineInput {
  description: string;
  quantity: number;
  unitPrice: number;
  vatCode: 'VAT_0' | 'VAT_15' | 'VAT_25';
}

export interface PaymentLinkInput {
  amount?: number; // Optional: defaults to invoice total
}

export interface NetsTerminalInput {
  amount?: number; // Optional: defaults to invoice total
}

