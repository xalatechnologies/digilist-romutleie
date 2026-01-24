/**
 * Dashboard Service
 * Aggregates data for dashboard summary
 */

import { DashboardSummary } from '../models/dashboard';
import {
  getRoomCounts,
  getOccupancyCounts,
  getArrivals,
  getDepartures,
  getHousekeepingTasks,
  getKitchenOrdersNext24h,
  getBillingSummary,
} from '../db/dashboardQueries';
import { UserRole } from '../middleware/rbac';

export class DashboardService {
  /**
   * Get dashboard summary for a specific date
   */
  async getSummary(date: string, userRoles: string[]): Promise<DashboardSummary> {
    // Parse date (expects YYYY-MM-DD)
    const dateStr = date || new Date().toISOString().split('T')[0];

    // Get base data (always available)
    const [rooms, occupancy, arrivals, departures, housekeeping] = await Promise.all([
      getRoomCounts(),
      getOccupancyCounts(dateStr),
      getArrivals(dateStr),
      getDepartures(dateStr),
      getHousekeepingTasks(dateStr),
    ]);

    const summary: DashboardSummary = {
      date: dateStr,
      rooms,
      occupancy,
      arrivals,
      departures,
      housekeeping,
    };

    // Kitchen data: available to ADMIN, BOOKING_STAFF, KITCHEN
    if (
      userRoles.includes(UserRole.ADMIN) ||
      userRoles.includes(UserRole.BOOKING_STAFF) ||
      userRoles.includes(UserRole.KITCHEN)
    ) {
      const kitchen = await getKitchenOrdersNext24h(dateStr);
      summary.kitchen = kitchen;
    }

    // Billing data: available to ADMIN, FINANCE
    if (userRoles.includes(UserRole.ADMIN) || userRoles.includes(UserRole.FINANCE)) {
      const billing = await getBillingSummary();
      summary.billing = billing;
    }

    return summary;
  }
}

export const dashboardService = new DashboardService();

