/**
 * Billing API Service
 * Frontend service for billing operations
 */

import { apiClient } from '../utils/apiClient';

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
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  sourceType: 'ROOM' | 'MEAL' | 'FEE';
  sourceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatCode: 'VAT_0' | 'VAT_15' | 'VAT_25';
  vatAmount: number;
  lineTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  method: 'PAYMENT_LINK' | 'NETS_TERMINAL';
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  amount: number;
  currency: string;
  externalRef?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceDetail {
  invoice: Invoice;
  lines: InvoiceLine[];
  payments: Payment[];
}

/**
 * Create invoice from reservation
 */
export async function createInvoiceFromReservation(
  reservationId: string,
  input: {
    customerName: string;
    reference1: string;
    reference2: string;
    nightlyRate?: number;
  }
): Promise<Invoice> {
  return await apiClient.post<Invoice>(`/billing/invoices/from-reservation/${reservationId}`, input);
}

/**
 * Get invoice detail
 */
export async function getInvoice(invoiceId: string): Promise<InvoiceDetail> {
  return await apiClient.get<InvoiceDetail>(`/billing/invoices/${invoiceId}`);
}

/**
 * Update invoice
 */
export async function updateInvoice(
  invoiceId: string,
  input: {
    reference1?: string;
    reference2?: string;
  }
): Promise<Invoice> {
  return await apiClient.patch<Invoice>(`/billing/invoices/${invoiceId}`, input);
}

/**
 * Add fee line to invoice
 */
export async function addFeeLine(
  invoiceId: string,
  input: {
    description: string;
    quantity: number;
    unitPrice: number;
    vatCode: 'VAT_0' | 'VAT_15' | 'VAT_25';
  }
): Promise<InvoiceLine> {
  return await apiClient.post<InvoiceLine>(`/billing/invoices/${invoiceId}/fee-line`, input);
}

/**
 * Remove invoice line
 */
export async function removeInvoiceLine(invoiceId: string, lineId: string): Promise<void> {
  return await apiClient.delete(`/billing/invoices/${invoiceId}/lines/${lineId}`);
}

/**
 * Mark invoice as sent
 */
export async function markInvoiceSent(invoiceId: string): Promise<Invoice> {
  return await apiClient.post<Invoice>(`/billing/invoices/${invoiceId}/mark-sent`, {});
}

/**
 * Mark invoice as paid
 */
export async function markInvoicePaid(invoiceId: string): Promise<Invoice> {
  return await apiClient.post<Invoice>(`/billing/invoices/${invoiceId}/mark-paid`, {});
}

/**
 * Void invoice
 */
export async function voidInvoice(invoiceId: string, reason: string): Promise<Invoice> {
  return await apiClient.post<Invoice>(`/billing/invoices/${invoiceId}/void`, { reason });
}

/**
 * Create payment link
 */
export async function createPaymentLink(
  invoiceId: string,
  amount?: number
): Promise<Payment> {
  return await apiClient.post<Payment>(`/billing/invoices/${invoiceId}/payment-link`, { amount });
}

/**
 * Initiate NETS terminal payment
 */
export async function initiateNetsTerminal(
  invoiceId: string,
  amount?: number
): Promise<Payment> {
  return await apiClient.post<Payment>(`/billing/invoices/${invoiceId}/nets-terminal/initiate`, { amount });
}

// --- Group Billing ---

export interface BookingGroupSummary {
  groupId: string;
  title?: string;
  reference1?: string;
  reference2?: string;
  customerName: string;
  reservationCount: number;
  dateRange: {
    minStartDate: string;
    maxEndDate: string;
  };
  estimatedTotal: number;
}

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
      startDate: string;
      endDate: string;
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
    orderDateTime: string;
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

/**
 * Get booking groups for invoicing
 */
export async function getGroupsForInvoicing(filters?: {
  from?: string;
  to?: string;
  q?: string;
}): Promise<{ groups: BookingGroupSummary[] }> {
  const params = new URLSearchParams();
  if (filters?.from) params.append('from', filters.from);
  if (filters?.to) params.append('to', filters.to);
  if (filters?.q) params.append('q', filters.q);
  const queryString = params.toString();
  return await apiClient.get<{ groups: BookingGroupSummary[] }>(
    `/billing/groups${queryString ? `?${queryString}` : ''}`
  );
}

/**
 * Get group invoice preview
 */
export async function getGroupInvoicePreview(
  groupId: string,
  nightlyRate: number
): Promise<GroupInvoicePreview> {
  return await apiClient.get<GroupInvoicePreview>(
    `/billing/groups/${groupId}/preview?nightlyRate=${nightlyRate}`
  );
}

/**
 * Create invoice from group
 */
export async function createInvoiceFromGroup(
  groupId: string,
  input: {
    reference1: string;
    reference2: string;
    nightlyRate: number;
  }
): Promise<Invoice> {
  return await apiClient.post<Invoice>(`/billing/invoices/from-group/${groupId}`, input);
}

