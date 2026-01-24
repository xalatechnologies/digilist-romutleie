import { IInvoice, IOutboxEvent, IInvoiceLine, VatCode } from '../types';

class IntegrationService {
  private outbox: IOutboxEvent[] = [];

  // Visma Adapter - Builds EHF/Peppol-ready payload
  async exportToVisma(invoice: IInvoice, lines: IInvoiceLine[]): Promise<{ success: boolean; eventId?: string; error?: string }> {
    // Validate required fields
    if (!invoice.reference1 || !invoice.reference2) {
      throw new Error('Invoice references (reference1 and reference2) are required for Visma export');
    }

    const now = new Date();
    const event: IOutboxEvent = {
      id: `OUTBOX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      eventType: 'VISMA_EXPORT',
      payload: {
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        reference1: invoice.reference1,
        reference2: invoice.reference2,
        currency: invoice.currency || 'NOK',
        subtotal: invoice.subtotal,
        vatTotal: invoice.vatTotal,
        total: invoice.total,
        issuedAt: invoice.issuedAt?.toISOString(),
        dueDate: invoice.dueDate?.toISOString(),
        lines: lines.map(line => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          vatCode: line.vatCode,
          vatAmount: line.vatAmount,
          lineTotal: line.lineTotal,
          sourceType: line.sourceType,
          sourceId: line.sourceId
        })),
        format: 'EHF/Peppol',
        exportedAt: now.toISOString()
      },
      status: 'PENDING',
      retryCount: 0,
      createdAt: now,
      updatedAt: now
    };
    
    this.outbox.push(event);
    
    // Process asynchronously
    this.processEvent(event.id).catch(err => {
      console.error('[Visma Export] Processing failed:', err);
    });
    
    return { success: true, eventId: event.id };
  }

  // NETS Terminal Adapter
  async initiateNetsPayment(amount: number, currency: string = 'NOK'): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      console.log(`[NETS STUB] Initiating terminal payment for ${currency} ${amount}`);
      // Stub: In production, this would call NETS API
      const transactionId = `NETS_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      return { success: true, transactionId };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Payment Link Generator (stub)
  async generatePaymentLink(invoiceId: string, amount: number, currency: string = 'NOK'): Promise<{ success: boolean; link?: string; error?: string }> {
    try {
      // Stub: In production, this would call payment provider API
      const link = `https://pay.digilist.no/checkout/${invoiceId}/${Math.random().toString(36).substr(2, 12)}`;
      return { success: true, link };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  private async processEvent(eventId: string): Promise<void> {
    const event = this.outbox.find(e => e.id === eventId);
    if (!event) return;

    try {
      console.log(`[INTEGRATION] Processing ${event.eventType} for event ${eventId}`);
      
      // Simulate Visma API call
      if (event.eventType === 'VISMA_EXPORT') {
        // In production, this would:
        // 1. Transform payload to Visma format
        // 2. Call Visma API
        // 3. Handle response/errors
        
        // Stub: Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Simulate success (90% success rate for demo)
        if (Math.random() > 0.1) {
          event.status = 'PROCESSED';
          event.updatedAt = new Date();
        } else {
          event.status = 'FAILED';
          event.lastError = 'Visma API timeout (stub)';
          event.retryCount++;
          event.updatedAt = new Date();
        }
      }
    } catch (err: any) {
      event.status = 'FAILED';
      event.lastError = err.message || 'Unknown error';
      event.retryCount++;
      event.updatedAt = new Date();
    }
  }

  // Retry failed export
  async retryExport(eventId: string): Promise<{ success: boolean; error?: string }> {
    const event = this.outbox.find(e => e.id === eventId);
    if (!event) {
      return { success: false, error: 'Event not found' };
    }
    
    if (event.status !== 'FAILED') {
      return { success: false, error: 'Event is not in FAILED status' };
    }
    
    event.status = 'PENDING';
    event.updatedAt = new Date();
    
    return this.processEvent(eventId).then(() => ({ success: true })).catch(err => ({
      success: false,
      error: err.message
    }));
  }

  getOutbox() { return this.outbox; }
  getOutboxByInvoice(invoiceId: string) {
    return this.outbox.filter(e => e.payload?.invoiceId === invoiceId);
  }
}

export const integrations = new IntegrationService();
