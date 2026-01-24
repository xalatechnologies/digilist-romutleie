-- Migration: 007_create_outbox_and_exports.sql
-- Description: Creates integration_outbox and accounting_exports tables for Visma export
-- Created: 2025-01-XX
-- Depends on: invoices (from migration 006)

-- Integration outbox table
CREATE TABLE IF NOT EXISTS integration_outbox (
  id VARCHAR(255) PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Accounting exports table
CREATE TABLE IF NOT EXISTS accounting_exports (
  id VARCHAR(255) PRIMARY KEY,
  invoice_id VARCHAR(255) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  target_system VARCHAR(50) NOT NULL DEFAULT 'VISMA',
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'CONFIRMED')),
  external_ref VARCHAR(255),
  last_error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_invoice_export UNIQUE (invoice_id, target_system)
);

-- Indexes for integration_outbox
CREATE INDEX IF NOT EXISTS idx_outbox_status_retry ON integration_outbox(status, next_retry_at, created_at);
CREATE INDEX IF NOT EXISTS idx_outbox_entity ON integration_outbox(entity_type, entity_id);

-- Indexes for accounting_exports
CREATE INDEX IF NOT EXISTS idx_accounting_exports_invoice_status ON accounting_exports(invoice_id, status);

-- Comments
COMMENT ON TABLE integration_outbox IS 'Outbox pattern for reliable integration event processing';
COMMENT ON TABLE accounting_exports IS 'Tracks export status per invoice to external accounting systems';
COMMENT ON COLUMN integration_outbox.event_type IS 'Event type (e.g., VISMA_EXPORT_INVOICE)';
COMMENT ON COLUMN integration_outbox.next_retry_at IS 'Timestamp for next retry attempt (null if no retry scheduled)';
COMMENT ON COLUMN accounting_exports.external_ref IS 'External reference ID from target system (e.g., Visma invoice ID)';

