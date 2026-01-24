-- Migration: 009_create_booking_groups.sql
-- Description: Creates booking_groups table and adds reservation_id to invoice_lines for traceability
-- Created: 2025-01-XX
-- Depends on: reservations (from migration 003), invoice_lines (from migration 006)

-- Booking groups table
CREATE TABLE IF NOT EXISTS booking_groups (
  id VARCHAR(255) PRIMARY KEY,
  customer_name TEXT NOT NULL,
  reference1 TEXT,
  reference2 TEXT,
  title TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add reservation_id to invoice_lines for traceability
ALTER TABLE invoice_lines 
ADD COLUMN IF NOT EXISTS reservation_id VARCHAR(255) REFERENCES reservations(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_booking_groups_customer ON booking_groups(customer_name);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_reservation ON invoice_lines(reservation_id) WHERE reservation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reservations_booking_group ON reservations(booking_group_id) WHERE booking_group_id IS NOT NULL;

-- Comments
COMMENT ON TABLE booking_groups IS 'Booking groups for multi-reservation invoicing';
COMMENT ON COLUMN invoice_lines.reservation_id IS 'Reservation ID for traceability (nullable for FEE lines)';

