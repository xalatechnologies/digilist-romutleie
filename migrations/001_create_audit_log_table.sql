-- Migration: 001_create_audit_log_table.sql
-- Description: Creates the AuditLog table with indexes for efficient querying
-- Created: 2025-01-XX

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  org_id VARCHAR(255) NOT NULL DEFAULT 'default-org',
  actor_user_id VARCHAR(255),
  actor_roles JSON NOT NULL DEFAULT '[]',
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255),
  message TEXT NOT NULL,
  before_state JSON,
  after_state JSON,
  metadata JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for entity-based queries (most common)
-- Supports: "Get all logs for room X"
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);

-- Index for actor-based queries
-- Supports: "Get all actions by user X"
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id, created_at DESC);

-- Index for organization-based queries
-- Supports: "Get all logs for org X in date range"
CREATE INDEX idx_audit_logs_org ON audit_logs(org_id, created_at DESC);

-- Index for action-based queries
-- Supports: "Get all ROOM_SET_OUT_OF_SERVICE events"
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);

-- Index for time-based queries
-- Supports: "Get all logs from last 24 hours"
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE audit_logs IS 'Unified audit log table for all system events and state changes';
COMMENT ON COLUMN audit_logs.org_id IS 'Organization/Tenant ID for multi-tenant support';
COMMENT ON COLUMN audit_logs.actor_user_id IS 'User ID who performed the action (NULL for system jobs)';
COMMENT ON COLUMN audit_logs.actor_roles IS 'JSON array of user roles at time of action';
COMMENT ON COLUMN audit_logs.action IS 'Action type enum (e.g., ROOM_SET_OUT_OF_SERVICE)';
COMMENT ON COLUMN audit_logs.entity_type IS 'Entity type enum (e.g., ROOM, INVOICE)';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the affected entity (NULL for system-wide events)';
COMMENT ON COLUMN audit_logs.message IS 'Human-readable description of the action';
COMMENT ON COLUMN audit_logs.before_state IS 'JSON snapshot of entity state before change';
COMMENT ON COLUMN audit_logs.after_state IS 'JSON snapshot of entity state after change';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context (requestId, IP, correlationId, etc.)';

