/**
 * Kitchen Controller
 * Handles kitchen items and meal orders endpoints
 */

import { Request, Response } from 'express';
import { kitchenService } from '../services/kitchenService';
import {
  KitchenItemCreateInput,
  KitchenItemUpdateInput,
  MealOrderCreateInput,
  MealOrderUpdateInput,
  MealOrderStatusUpdateInput,
} from '../models/kitchen';
import { requireRole, UserRole } from '../middleware/rbac';

/**
 * GET /kitchen/items
 * Get kitchen items
 */
export async function getKitchenItems(req: Request, res: Response): Promise<void> {
  try {
    const activeOnly = req.query.active === 'true';
    const items = await kitchenService.getItems(activeOnly);
    res.json({ items });
  } catch (error: any) {
    console.error('Error fetching kitchen items:', error);
    res.status(500).json({
      error: 'Failed to fetch kitchen items',
      message: error.message,
    });
  }
}

/**
 * POST /kitchen/items
 * Create kitchen item
 * Required role: ADMIN or KITCHEN
 */
export async function createKitchenItem(req: Request, res: Response): Promise<void> {
  try {
    const input: KitchenItemCreateInput = req.body;

    if (!input.name || !input.unitPrice || !input.vatCode) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'name, unitPrice, and vatCode are required',
      });
      return;
    }

    const item = await kitchenService.createItem(req, input);
    res.status(201).json(item);
  } catch (error: any) {
    console.error('Error creating kitchen item:', error);
    res.status(400).json({
      error: 'Failed to create kitchen item',
      message: error.message,
    });
  }
}

/**
 * PATCH /kitchen/items/:id
 * Update kitchen item
 * Required role: ADMIN or KITCHEN
 */
export async function updateKitchenItem(req: Request, res: Response): Promise<void> {
  try {
    const itemId = req.params.id;
    const input: KitchenItemUpdateInput = req.body;

    const item = await kitchenService.updateItem(req, itemId, input);
    res.json(item);
  } catch (error: any) {
    console.error('Error updating kitchen item:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      error: 'Failed to update kitchen item',
      message: error.message,
    });
  }
}

/**
 * GET /kitchen/orders
 * Get meal orders with filters
 */
export async function getMealOrders(req: Request, res: Response): Promise<void> {
  try {
    const filters = {
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      status: req.query.status as string | undefined,
      reservationId: req.query.reservationId as string | undefined,
      bookingGroupId: req.query.bookingGroupId as string | undefined,
      q: req.query.q as string | undefined,
    };

    const orders = await kitchenService.getOrders(filters);
    res.json({ orders });
  } catch (error: any) {
    console.error('Error fetching meal orders:', error);
    res.status(500).json({
      error: 'Failed to fetch meal orders',
      message: error.message,
    });
  }
}

/**
 * POST /kitchen/orders
 * Create meal order
 * Required role: BOOKING_STAFF or ADMIN
 */
export async function createMealOrder(req: Request, res: Response): Promise<void> {
  try {
    const input: MealOrderCreateInput = req.body;

    if (!input.kitchenItemId || !input.orderDateTime || !input.quantity || !input.servingLocation) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'kitchenItemId, orderDateTime, quantity, and servingLocation are required',
      });
      return;
    }

    const order = await kitchenService.createOrder(req, input);
    res.status(201).json(order);
  } catch (error: any) {
    console.error('Error creating meal order:', error);
    res.status(400).json({
      error: 'Failed to create meal order',
      message: error.message,
    });
  }
}

/**
 * PATCH /kitchen/orders/:id
 * Update meal order (limited fields)
 * Required role: BOOKING_STAFF or ADMIN
 */
export async function updateMealOrder(req: Request, res: Response): Promise<void> {
  try {
    const orderId = req.params.id;
    const input: MealOrderUpdateInput = req.body;

    const order = await kitchenService.updateOrder(req, orderId, input);
    res.json(order);
  } catch (error: any) {
    console.error('Error updating meal order:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      error: 'Failed to update meal order',
      message: error.message,
    });
  }
}

/**
 * PATCH /kitchen/orders/:id/status
 * Update meal order status
 * Required role: KITCHEN or ADMIN
 */
export async function updateMealOrderStatus(req: Request, res: Response): Promise<void> {
  try {
    const orderId = req.params.id;
    const input: MealOrderStatusUpdateInput = req.body;

    if (!input.status) {
      res.status(400).json({
        error: 'Missing required field',
        message: 'status is required',
      });
      return;
    }

    const order = await kitchenService.updateOrderStatus(req, orderId, input);
    res.json(order);
  } catch (error: any) {
    console.error('Error updating meal order status:', error);
    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('Invalid status transition') ? 400 : 500;
    res.status(statusCode).json({
      error: 'Failed to update meal order status',
      message: error.message,
    });
  }
}

/**
 * GET /kitchen/board
 * Get kitchen board view (optimized)
 */
export async function getKitchenBoard(req: Request, res: Response): Promise<void> {
  try {
    const filters = {
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      status: req.query.status as string | undefined,
    };

    const board = await kitchenService.getBoard(filters);
    res.json({ board });
  } catch (error: any) {
    console.error('Error fetching kitchen board:', error);
    res.status(500).json({
      error: 'Failed to fetch kitchen board',
      message: error.message,
    });
  }
}

// Export middleware for route protection
export const requireKitchen = requireRole([UserRole.KITCHEN, UserRole.ADMIN]);
export const requireBookingStaff = requireRole([UserRole.BOOKING_STAFF, UserRole.ADMIN]);

