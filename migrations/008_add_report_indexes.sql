-- Migration: 008_add_report_indexes.sql
-- Description: Adds indexes for report queries (occupancy and invoice history)
-- Created: 2025-01-XX
-- Depends on: reservations (from migration 003), invoices (from migration 006), accounting_exports (from migration 007)

-- Indexes for occupancy reports (reservations date range queries)
CREATE INDEX IF NOT EXISTS idx_reservations_date_range ON reservations(start_date, end_date) WHERE status IN ('CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT');
CREATE INDEX IF NOT EXISTS idx_reservations_start_date ON reservations(start_date) WHERE status IN ('CONFIRMED', 'CHECKED_IN');
CREATE INDEX IF NOT EXISTS idx_reservations_end_date ON reservations(end_date) WHERE status IN ('CHECKED_IN', 'CHECKED_OUT');

-- Indexes for invoice history reports
CREATE INDEX IF NOT EXISTS idx_invoices_created_status ON invoices(created_at, status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_search ON invoices(customer_name) WHERE customer_name IS NOT NULL;

-- Indexes for export status filtering (already exists but ensure it's there)
-- accounting_exports(invoice_id, status) already exists from migration 007

-- Comments
COMMENT ON INDEX idx_reservations_date_range IS 'Optimizes occupancy report queries for date range overlaps';
COMMENT ON INDEX idx_invoices_created_status IS 'Optimizes invoice history report queries by date and status';

