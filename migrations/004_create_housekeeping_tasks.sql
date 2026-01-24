-- Migration: 004_create_housekeeping_tasks.sql
-- Description: Creates housekeeping_tasks table for tracking cleaning tasks
-- Created: 2025-01-XX
-- Depends on: rooms, reservations (from migration 003)

CREATE TABLE IF NOT EXISTS housekeeping_tasks (
  id VARCHAR(255) PRIMARY KEY,
  room_id VARCHAR(255) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  reservation_id VARCHAR(255) REFERENCES reservations(id) ON DELETE SET NULL,
  due_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, DONE
  created_by VARCHAR(255),
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_reservation_task UNIQUE (reservation_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_room_date ON housekeeping_tasks(room_id, due_date);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_status_date ON housekeeping_tasks(status, due_date);

-- Comments
COMMENT ON TABLE housekeeping_tasks IS 'Housekeeping tasks created from checkouts and manual requests';
COMMENT ON COLUMN housekeeping_tasks.reservation_id IS 'Reservation that triggered this task (nullable for manual tasks)';
COMMENT ON COLUMN housekeeping_tasks.status IS 'PENDING, IN_PROGRESS, DONE';
COMMENT ON COLUMN housekeeping_tasks.due_date IS 'Date when task should be completed';

