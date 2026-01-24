/**
 * Report Controller
 * Handles reporting endpoints with RBAC
 */

import { Request, Response } from 'express';
import { getMonthlyOccupancyReport, getYearlyOccupancyReport, getInvoiceHistoryReport } from '../db/reportQueries';
import { buildCsv } from '../utils/csvBuilder';
import { requireRole, UserRole } from '../middleware/rbac';

/**
 * GET /reports/occupancy/monthly?month=&year=
 * Monthly occupancy report
 * Required role: BOOKING_STAFF, FINANCE, or ADMIN
 */
export async function getMonthlyOccupancyReport(req: Request, res: Response): Promise<void> {
  try {
    const month = parseInt(req.query.month as string, 10);
    const year = parseInt(req.query.year as string, 10);

    if (!month || !year || month < 1 || month > 12) {
      res.status(400).json({
        error: 'Invalid parameters',
        message: 'month (1-12) and year are required',
      });
      return;
    }

    const report = await getMonthlyOccupancyReport(month, year);
    res.json(report);
  } catch (error: any) {
    console.error('Error generating monthly occupancy report:', error);
    res.status(500).json({
      error: 'Failed to generate monthly occupancy report',
      message: error.message,
    });
  }
}

/**
 * GET /reports/occupancy/monthly.csv?month=&year=
 * Monthly occupancy report (CSV)
 * Required role: BOOKING_STAFF, FINANCE, or ADMIN
 */
export async function getMonthlyOccupancyReportCsv(req: Request, res: Response): Promise<void> {
  try {
    const month = parseInt(req.query.month as string, 10);
    const year = parseInt(req.query.year as string, 10);

    if (!month || !year || month < 1 || month > 12) {
      res.status(400).json({
        error: 'Invalid parameters',
        message: 'month (1-12) and year are required',
      });
      return;
    }

    const report = await getMonthlyOccupancyReport(month, year);

    // Build CSV
    const csv = buildCsv(
      [report],
      [
        { key: 'month', label: 'Month' },
        { key: 'year', label: 'Year' },
        { key: 'roomsAvailable', label: 'Rooms Available' },
        { key: 'roomNightsSold', label: 'Room Nights Sold' },
        { key: 'guestNights', label: 'Guest Nights' },
        { key: 'occupancyRate', label: 'Occupancy Rate %' },
        { key: 'arrivals', label: 'Arrivals' },
        { key: 'departures', label: 'Departures' },
      ]
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="occupancy-monthly-${year}-${month}.csv"`);
    res.send(csv);
  } catch (error: any) {
    console.error('Error generating monthly occupancy CSV:', error);
    res.status(500).json({
      error: 'Failed to generate monthly occupancy CSV',
      message: error.message,
    });
  }
}

/**
 * GET /reports/occupancy/yearly?year=
 * Yearly occupancy report
 * Required role: BOOKING_STAFF, FINANCE, or ADMIN
 */
export async function getYearlyOccupancyReport(req: Request, res: Response): Promise<void> {
  try {
    const year = parseInt(req.query.year as string, 10);

    if (!year || year < 2000 || year > 2100) {
      res.status(400).json({
        error: 'Invalid parameters',
        message: 'year is required (2000-2100)',
      });
      return;
    }

    const report = await getYearlyOccupancyReport(year);
    res.json(report);
  } catch (error: any) {
    console.error('Error generating yearly occupancy report:', error);
    res.status(500).json({
      error: 'Failed to generate yearly occupancy report',
      message: error.message,
    });
  }
}

/**
 * GET /reports/occupancy/yearly.csv?year=
 * Yearly occupancy report (CSV)
 * Required role: BOOKING_STAFF, FINANCE, or ADMIN
 */
export async function getYearlyOccupancyReportCsv(req: Request, res: Response): Promise<void> {
  try {
    const year = parseInt(req.query.year as string, 10);

    if (!year || year < 2000 || year > 2100) {
      res.status(400).json({
        error: 'Invalid parameters',
        message: 'year is required (2000-2100)',
      });
      return;
    }

    const report = await getYearlyOccupancyReport(year);

    // Build CSV with months + totals row
    const csvData = [
      ...report.months.map(m => ({
        month: m.month,
        year: report.year,
        roomsAvailable: m.roomsAvailable,
        roomNightsSold: m.roomNightsSold,
        guestNights: m.guestNights,
        occupancyRate: m.occupancyRate,
        arrivals: m.arrivals,
        departures: m.departures,
      })),
      {
        month: 'TOTAL',
        year: report.year,
        roomsAvailable: '',
        roomNightsSold: report.totals.roomNightsSold,
        guestNights: report.totals.guestNights,
        occupancyRate: report.totals.avgOccupancyRate,
        arrivals: report.totals.arrivals,
        departures: report.totals.departures,
      },
    ];

    const csv = buildCsv(csvData, [
      { key: 'month', label: 'Month' },
      { key: 'year', label: 'Year' },
      { key: 'roomsAvailable', label: 'Rooms Available' },
      { key: 'roomNightsSold', label: 'Room Nights Sold' },
      { key: 'guestNights', label: 'Guest Nights' },
      { key: 'occupancyRate', label: 'Occupancy Rate %' },
      { key: 'arrivals', label: 'Arrivals' },
      { key: 'departures', label: 'Departures' },
    ]);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="occupancy-yearly-${year}.csv"`);
    res.send(csv);
  } catch (error: any) {
    console.error('Error generating yearly occupancy CSV:', error);
    res.status(500).json({
      error: 'Failed to generate yearly occupancy CSV',
      message: error.message,
    });
  }
}

/**
 * GET /reports/invoices/history?from=&to=&status=&q=&exportStatus=&limit=&offset=
 * Invoice history report
 * Required role: FINANCE or ADMIN
 */
export async function getInvoiceHistoryReport(req: Request, res: Response): Promise<void> {
  try {
    const params = {
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      status: req.query.status as string | undefined,
      q: req.query.q as string | undefined,
      exportStatus: req.query.exportStatus as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
    };

    const report = await getInvoiceHistoryReport(params);
    res.json(report);
  } catch (error: any) {
    console.error('Error generating invoice history report:', error);
    res.status(500).json({
      error: 'Failed to generate invoice history report',
      message: error.message,
    });
  }
}

/**
 * GET /reports/invoices/history.csv?from=&to=&status=&q=&exportStatus=
 * Invoice history report (CSV)
 * Required role: FINANCE or ADMIN
 */
export async function getInvoiceHistoryReportCsv(req: Request, res: Response): Promise<void> {
  try {
    const params = {
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      status: req.query.status as string | undefined,
      q: req.query.q as string | undefined,
      exportStatus: req.query.exportStatus as string | undefined,
      limit: 10000, // Large limit for CSV export
      offset: 0,
    };

    const report = await getInvoiceHistoryReport(params);

    // Build CSV
    const csv = buildCsv(report.items, [
      { key: 'invoiceId', label: 'Invoice ID' },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'status', label: 'Status' },
      { key: 'total', label: 'Total' },
      { key: 'createdAt', label: 'Created At' },
      { key: 'exportStatus', label: 'Export Status' },
      { key: 'lastError', label: 'Last Error' },
    ]);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-history-${params.from || 'all'}-${params.to || 'all'}.csv"`);
    res.send(csv);
  } catch (error: any) {
    console.error('Error generating invoice history CSV:', error);
    res.status(500).json({
      error: 'Failed to generate invoice history CSV',
      message: error.message,
    });
  }
}

// Export middleware for route protection
export const requireBookingStaffOrFinance = requireRole([
  UserRole.BOOKING_STAFF,
  UserRole.FINANCE,
  UserRole.ADMIN,
]);
export const requireFinance = requireRole([UserRole.FINANCE, UserRole.ADMIN]);

