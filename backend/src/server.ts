/**
 * Express Server Entrypoint
 * Backend API server for Digilist Romutleie
 */

import express, { Express } from 'express';
import cors from 'cors';
import { requestContextMiddleware } from './middleware/requestContext';
import { authMiddleware } from './middleware/auth';
import { getAuditLogs } from './controllers/auditController';
import { getDashboardSummary } from './controllers/dashboardController';
import {
  getMonthlyOccupancyReport,
  getMonthlyOccupancyReportCsv,
  getYearlyOccupancyReport,
  getYearlyOccupancyReportCsv,
  getInvoiceHistoryReport,
  getInvoiceHistoryReportCsv,
  requireBookingStaffOrFinance,
  requireFinance,
} from './controllers/reportController';
import { getRoomsSummary, getRoomDetail, updateRoomStatus } from './controllers/roomController';
import { createReservation, updateReservationStatus, requireBookingStaff } from './controllers/reservationController';
import { getHousekeepingTasks, updateHousekeepingTask, updateRoomCondition, requireHousekeeping } from './controllers/housekeepingController';
import {
  getKitchenItems,
  createKitchenItem,
  updateKitchenItem,
  getMealOrders,
  createMealOrder,
  updateMealOrder,
  updateMealOrderStatus,
  getKitchenBoard,
  requireKitchen,
  requireBookingStaff as requireBookingStaffKitchen,
} from './controllers/kitchenController';
import {
  createInvoiceFromReservation,
  getInvoice,
  updateInvoice,
  addFeeLine,
  removeInvoiceLine,
  markInvoiceSent,
  markInvoicePaid,
  voidInvoice,
  createPaymentLink,
  initiateNetsTerminal,
  queueVismaExport,
  retryVismaExport,
  getInvoiceExports,
  getGroupsForInvoicing,
  getGroupInvoicePreview,
  createInvoiceFromGroup,
  requireFinance,
  requireFinanceOrBookingStaff,
} from './controllers/billingController';
import { outboxProcessor } from './services/outboxProcessor';
import { Request } from 'express';

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-request-id', 'x-user-id', 'x-user-roles', 'x-org-id', 'x-correlation-id'],
}));
app.use(express.json());

// Request context must be early in the chain
app.use(requestContextMiddleware);

// Auth middleware (optional, allows unauthenticated)
app.use(authMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Audit endpoints
app.get('/audit', getAuditLogs);

// Dashboard endpoints
app.get('/dashboard/summary', getDashboardSummary);

// Report endpoints
app.get('/reports/occupancy/monthly', requireBookingStaffOrFinance, getMonthlyOccupancyReport);
app.get('/reports/occupancy/monthly.csv', requireBookingStaffOrFinance, getMonthlyOccupancyReportCsv);
app.get('/reports/occupancy/yearly', requireBookingStaffOrFinance, getYearlyOccupancyReport);
app.get('/reports/occupancy/yearly.csv', requireBookingStaffOrFinance, getYearlyOccupancyReportCsv);
app.get('/reports/invoices/history', requireFinance, getInvoiceHistoryReport);
app.get('/reports/invoices/history.csv', requireFinance, getInvoiceHistoryReportCsv);

// Room endpoints
app.get('/rooms/summary', getRoomsSummary);
app.get('/rooms/:id/detail', getRoomDetail);
app.patch('/rooms/:id/status', updateRoomStatus);

// Reservation endpoints
app.post('/reservations', requireBookingStaff, createReservation);
app.patch('/reservations/:id/status', requireBookingStaff, updateReservationStatus);

// Housekeeping endpoints
app.get('/housekeeping/tasks', requireHousekeeping, getHousekeepingTasks);
app.patch('/housekeeping/tasks/:id', requireHousekeeping, updateHousekeepingTask);
app.patch('/rooms/:id/condition', requireHousekeeping, updateRoomCondition);

// Kitchen endpoints
app.get('/kitchen/items', getKitchenItems);
app.post('/kitchen/items', requireKitchen, createKitchenItem);
app.patch('/kitchen/items/:id', requireKitchen, updateKitchenItem);
app.get('/kitchen/orders', getMealOrders);
app.post('/kitchen/orders', requireBookingStaffKitchen, createMealOrder);
app.patch('/kitchen/orders/:id', requireBookingStaffKitchen, updateMealOrder);
app.patch('/kitchen/orders/:id/status', requireKitchen, updateMealOrderStatus);
app.get('/kitchen/board', getKitchenBoard);

// Billing endpoints
app.post('/billing/invoices/from-reservation/:reservationId', requireFinanceOrBookingStaff, createInvoiceFromReservation);
app.get('/billing/invoices/:id', requireFinance, getInvoice);
app.patch('/billing/invoices/:id', requireFinance, updateInvoice);
app.post('/billing/invoices/:id/fee-line', requireFinance, addFeeLine);
app.delete('/billing/invoices/:id/lines/:lineId', requireFinance, removeInvoiceLine);
app.post('/billing/invoices/:id/mark-sent', requireFinance, markInvoiceSent);
app.post('/billing/invoices/:id/mark-paid', requireFinance, markInvoicePaid);
app.post('/billing/invoices/:id/void', requireFinance, voidInvoice);
app.post('/billing/invoices/:id/payment-link', requireFinance, createPaymentLink);
app.post('/billing/invoices/:id/nets-terminal/initiate', requireFinance, initiateNetsTerminal);
app.post('/billing/invoices/:id/export/visma', requireFinance, queueVismaExport);
app.post('/billing/invoices/:id/export/visma/retry', requireFinance, retryVismaExport);
app.get('/billing/invoices/:id/exports', requireFinance, getInvoiceExports);

// Group billing endpoints
app.get('/billing/groups', requireFinance, getGroupsForInvoicing);
app.get('/billing/groups/:groupId/preview', requireFinance, getGroupInvoicePreview);
app.post('/billing/invoices/from-group/:groupId', requireFinance, createInvoiceFromGroup);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Outbox processor: process pending events every 10 seconds
const PROCESSOR_INTERVAL_MS = 10 * 1000; // 10 seconds

function startOutboxProcessor() {
  setInterval(async () => {
    try {
      const processed = await outboxProcessor.processPending();
      if (processed > 0) {
        console.log(`[OutboxProcessor] Processed ${processed} event(s)`);
      }
    } catch (error: any) {
      console.error('[OutboxProcessor] Error processing events:', error);
    }
  }, PROCESSOR_INTERVAL_MS);

  console.log(`[OutboxProcessor] Started (interval: ${PROCESSOR_INTERVAL_MS}ms)`);
}

// Start server
// In ES modules, always start the server when this file is executed directly
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Audit endpoint: http://localhost:${PORT}/audit`);
});

// Start outbox processor
startOutboxProcessor();

export default app;

