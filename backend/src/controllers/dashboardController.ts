/**
 * Dashboard Controller
 * Handles dashboard summary endpoint
 */

import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboardService';
import { getRequestContext } from '../middleware/requestContext';

/**
 * GET /dashboard/summary?date=YYYY-MM-DD
 * Get dashboard summary for a specific date
 * RBAC: Different roles see different data blocks
 */
export async function getDashboardSummary(req: Request, res: Response): Promise<void> {
  try {
    const context = getRequestContext(req);
    const date = req.query.date as string | undefined;

    // Default to today if not provided
    const dateStr = date || new Date().toISOString().split('T')[0];

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      res.status(400).json({
        error: 'Invalid date format',
        message: 'Date must be in YYYY-MM-DD format',
      });
      return;
    }

    // Get user roles from context
    const userRoles = context.roles || [];

    // Get summary (service handles RBAC filtering)
    const summary = await dashboardService.getSummary(dateStr, userRoles);

    res.json(summary);
  } catch (error: any) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard summary',
      message: error.message,
    });
  }
}

