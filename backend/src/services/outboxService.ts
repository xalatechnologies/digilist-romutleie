/**
 * Outbox Service
 * Handles enqueueing integration events
 */

import { randomUUID } from 'crypto';
import { createOutboxEvent } from '../db/outboxQueries';
import { OutboxEvent } from '../models/outbox';

export class OutboxService {
  /**
   * Enqueue an event to the outbox
   */
  async enqueue(
    eventType: string,
    entityType: string,
    entityId: string,
    payload: any
  ): Promise<OutboxEvent> {
    const eventId = randomUUID();
    return await createOutboxEvent({
      id: eventId,
      eventType,
      entityType,
      entityId,
      payload,
    });
  }
}

export const outboxService = new OutboxService();

