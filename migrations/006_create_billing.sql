-- Migration: 006_create_billing.sql
-- Description: Creates invoices, invoice_lines, and payments tables for billing module
-- Created: 2025-01-XX
-- Depends on: reservations (from migration 003), meal_orders (from migration 005)

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(255) PRIMARY KEY,
  reservation_id VARCHAR(255) REFERENCES reservations(id) ON DELETE SET NULL,
  booking_group_id VARCHAR(255),
  customer_name TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'PAID', 'VOID')),
  reference1 TEXT NOT NULL DEFAULT '',
  reference2 TEXT NOT NULL DEFAULT '',
  currency VARCHAR(10) NOT NULL DEFAULT 'NOK',
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  vat_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_by VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Invoice lines table
CREATE TABLE IF NOT EXISTS invoice_lines (
  id VARCHAR(255) PRIMARY KEY,
  invoice_id VARCHAR(255) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('ROOM', 'MEAL', 'FEE')),
  source_id VARCHAR(255),
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL,
  vat_code VARCHAR(10) NOT NULL CHECK (vat_code IN ('VAT_0', 'VAT_15', 'VAT_25')),
  vat_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  line_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_source_line UNIQUE (invoice_id, source_type, source_id)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(255) PRIMARY KEY,
  invoice_id VARCHAR(255) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  method VARCHAR(50) NOT NULL CHECK (method IN ('PAYMENT_LINK', 'NETS_TERMINAL')),
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED')),
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'NOK',
  external_ref VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_status_created ON invoices(status, created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_reservation ON invoices(reservation_id) WHERE reservation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_booking_group ON invoices(booking_group_id) WHERE booking_group_id IS NOT NULL;

-- Indexes for invoice_lines
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_invoice_status ON payments(invoice_id, status);

-- Comments
COMMENT ON TABLE invoices IS 'Invoices generated from reservations or booking groups';
COMMENT ON TABLE invoice_lines IS 'Invoice line items (ROOM, MEAL, or FEE) with VAT calculation';
COMMENT ON TABLE payments IS 'Payment records linked to invoices';
COMMENT ON COLUMN invoice_lines.source_type IS 'ROOM, MEAL, or FEE';
COMMENT ON COLUMN invoice_lines.source_id IS 'ID of source entity (reservation_id for ROOM, meal_order_id for MEAL, null for FEE)';
COMMENT ON COLUMN invoice_lines.vat_code IS 'VAT_0, VAT_15, or VAT_25';

