/**
 * Kitchen Service
 * Handles kitchen items and meal orders with audit logging
 */

import { Request } from 'express';
import { randomUUID } from 'crypto';
import { auditService } from './auditService';
import {
  getKitchenItems,
  getKitchenItemById,
  createKitchenItem as createItem,
  updateKitchenItem as updateItem,
  getMealOrders,
  getMealOrderById,
  createMealOrder as createOrder,
  updateMealOrder as updateOrder,
  updateMealOrderStatus as updateOrderStatus,
  getKitchenBoard,
} from '../db/kitchenQueries';
import {
  KitchenItem,
  MealOrder,
  KitchenItemCreateInput,
  KitchenItemUpdateInput,
  MealOrderCreateInput,
  MealOrderUpdateInput,
  MealOrderStatusUpdateInput,
  KitchenBoardItem,
} from '../models/kitchen';
import { getRequestContext } from '../middleware/requestContext';

export class KitchenService {
  /**
   * Valid status transitions for meal orders
   */
  private static readonly VALID_TRANSITIONS: Record<string, string[]> = {
    PLANNED: ['IN_PREP', 'CANCELLED'],
    IN_PREP: ['READY', 'CANCELLED'],
    READY: ['DELIVERED'],
    DELIVERED: [], // Terminal
    CANCELLED: [], // Terminal
  };

  /**
   * Check if status transition is valid
   */
  static isValidTransition(from: string, to: string): boolean {
    return this.VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  /**
   * Get kitchen items
   */
  async getItems(activeOnly: boolean = false): Promise<KitchenItem[]> {
    return await getKitchenItems(activeOnly);
  }

  /**
   * Get kitchen item by ID
   */
  async getItemById(id: string): Promise<KitchenItem | null> {
    return await getKitchenItemById(id);
  }

  /**
   * Create kitchen item
   */
  async createItem(req: Request, input: KitchenItemCreateInput): Promise<KitchenItem> {
    const context = getRequestContext(req);
    const itemId = randomUUID();

    const item = await createItem({
      ...input,
      id: itemId,
    });

    // Audit log
    await auditService.log(req, {
      action: 'KITCHEN_ITEM_CREATED',
      entityType: 'KITCHEN_ITEM',
      entityId: itemId,
      message: `Kitchen item created: ${input.name} (${input.unitPrice} NOK, VAT ${input.vatCode})`,
      after: {
        name: input.name,
        unitPrice: input.unitPrice,
        vatCode: input.vatCode,
        isActive: input.isActive !== false,
      },
    });

    return item;
  }

  /**
   * Update kitchen item
   */
  async updateItem(req: Request, id: string, input: KitchenItemUpdateInput): Promise<KitchenItem> {
    const current = await getKitchenItemById(id);
    if (!current) {
      throw new Error(`Kitchen item ${id} not found`);
    }

    const updated = await updateItem(id, input);

    // Determine action type
    let action = 'KITCHEN_ITEM_UPDATED';
    if (input.isActive === false && current.isActive) {
      action = 'KITCHEN_ITEM_DEACTIVATED';
    }

    // Audit log
    await auditService.logChange(req, {
      entityType: 'KITCHEN_ITEM',
      entityId: id,
      action,
      before: {
        name: current.name,
        unitPrice: current.unitPrice,
        vatCode: current.vatCode,
        isActive: current.isActive,
      },
      after: {
        name: updated.name,
        unitPrice: updated.unitPrice,
        vatCode: updated.vatCode,
        isActive: updated.isActive,
      },
      message: action === 'KITCHEN_ITEM_DEACTIVATED'
        ? `Kitchen item deactivated: ${updated.name}`
        : `Kitchen item updated: ${updated.name}`,
    });

    return updated;
  }

  /**
   * Get meal orders
   */
  async getOrders(filters?: {
    from?: string;
    to?: string;
    status?: string;
    reservationId?: string;
    bookingGroupId?: string;
    q?: string;
  }): Promise<MealOrder[]> {
    return await getMealOrders(filters);
  }

  /**
   * Get meal order by ID
   */
  async getOrderById(id: string): Promise<MealOrder | null> {
    return await getMealOrderById(id);
  }

  /**
   * Create meal order
   */
  async createOrder(req: Request, input: MealOrderCreateInput): Promise<MealOrder> {
    const context = getRequestContext(req);

    // Validate kitchen item is active
    const item = await getKitchenItemById(input.kitchenItemId);
    if (!item) {
      throw new Error(`Kitchen item ${input.kitchenItemId} not found`);
    }
    if (!item.isActive) {
      throw new Error(`Cannot create order: kitchen item ${item.name} is inactive`);
    }

    const orderId = randomUUID();
    const order = await createOrder({
      ...input,
      id: orderId,
      createdBy: context.userId || undefined,
    });

    // Format order datetime for message
    const orderDate = new Date(input.orderDateTime);
    const dateStr = orderDate.toISOString().split('T')[0];
    const timeStr = orderDate.toTimeString().split(' ')[0].substring(0, 5);

    // Audit log
    await auditService.log(req, {
      action: 'MEAL_ORDER_CREATED',
      entityType: 'MEAL_ORDER',
      entityId: orderId,
      message: `Meal order created: ${item.name} × ${input.quantity} (${dateStr} ${timeStr})`,
      after: {
        kitchenItemId: input.kitchenItemId,
        itemName: item.name,
        quantity: input.quantity,
        orderDateTime: input.orderDateTime,
        servingLocation: input.servingLocation,
        status: 'PLANNED',
      },
      metadata: {
        reservationId: input.reservationId,
        bookingGroupId: input.bookingGroupId,
      },
    });

    return order;
  }

  /**
   * Update meal order (limited fields)
   */
  async updateOrder(req: Request, id: string, input: MealOrderUpdateInput): Promise<MealOrder> {
    const current = await getMealOrderById(id);
    if (!current) {
      throw new Error(`Meal order ${id} not found`);
    }

    const updated = await updateOrder(id, input);

    // Audit log
    await auditService.logChange(req, {
      entityType: 'MEAL_ORDER',
      entityId: id,
      action: 'MEAL_ORDER_UPDATED',
      before: {
        servingLocation: current.servingLocation,
        referenceText: current.referenceText,
        notes: current.notes,
      },
      after: {
        servingLocation: updated.servingLocation,
        referenceText: updated.referenceText,
        notes: updated.notes,
      },
      message: `Meal order updated (order ${id})`,
    });

    return updated;
  }

  /**
   * Update meal order status
   */
  async updateOrderStatus(
    req: Request,
    id: string,
    input: MealOrderStatusUpdateInput
  ): Promise<MealOrder> {
    const current = await getMealOrderById(id);
    if (!current) {
      throw new Error(`Meal order ${id} not found`);
    }

    // Validate transition
    if (!KitchenService.isValidTransition(current.status, input.status)) {
      throw new Error(
        `Invalid status transition: ${current.status} → ${input.status}. ` +
        `Valid transitions from ${current.status}: ${KitchenService.VALID_TRANSITIONS[current.status]?.join(', ') || 'none'}`
      );
    }

    const updated = await updateOrderStatus(id, input.status);

    // Get item name for message
    const item = await getKitchenItemById(current.kitchenItemId);
    const itemName = item?.name || 'Unknown item';

    // Audit log
    await auditService.logChange(req, {
      entityType: 'MEAL_ORDER',
      entityId: id,
      action: 'MEAL_ORDER_STATUS_CHANGED',
      before: {
        status: current.status,
      },
      after: {
        status: updated.status,
      },
      message: `Meal order status changed: ${current.status} → ${updated.status} (${itemName} × ${current.quantity})`,
    });

    return updated;
  }

  /**
   * Get kitchen board (optimized for board view)
   */
  async getBoard(filters?: {
    from?: string;
    to?: string;
    status?: string;
  }): Promise<KitchenBoardItem[]> {
    return await getKitchenBoard(filters);
  }
}

export const kitchenService = new KitchenService();

