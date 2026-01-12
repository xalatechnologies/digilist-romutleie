
import { IInvoice, IOutboxEvent } from '../types';

class IntegrationService {
  private outbox: IOutboxEvent[] = [];

  // Visma Adapter
  async exportToVisma(invoice: IInvoice) {
    const event: IOutboxEvent = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'VISMA_EXPORT',
      payload: {
        receiver: invoice.customerName,
        total: invoice.amount,
        ref1: invoice.reference1,
        ref2: invoice.reference2,
        lines: invoice.lines,
        format: 'EHF/Peppol'
      },
      status: 'PENDING',
      attempts: 0
    };
    this.outbox.push(event);
    return this.processEvent(event.id);
  }

  // NETS Adapter
  async initiateNetsPayment(amount: number) {
    console.log(`[NETS STUB] Initiating payment for NOK ${amount}`);
    return { success: true, transactionId: 'NETS_' + Date.now() };
  }

  private async processEvent(eventId: string) {
    const event = this.outbox.find(e => e.id === eventId);
    if (!event) return;

    try {
      console.log(`[INTEGRATION] Processing ${event.type} for payload:`, event.payload);
      // Simulate API call
      event.status = 'PROCESSED';
      return { success: true };
    } catch (err) {
      event.status = 'FAILED';
      event.attempts++;
      return { success: false, error: err };
    }
  }

  getOutbox() { return this.outbox; }
}

export const integrations = new IntegrationService();
