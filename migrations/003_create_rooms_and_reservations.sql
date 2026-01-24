-- Migration: 003_create_rooms_and_reservations.sql
-- Description: Creates rooms and reservations tables for availability engine
-- Created: 2025-01-XX
-- Depends on: None (base tables)

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(255) PRIMARY KEY,
  number VARCHAR(50) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL, -- SINGLE, DOUBLE, APARTMENT
  capacity INTEGER NOT NULL DEFAULT 1,
  floor INTEGER,
  price_per_night DECIMAL(10, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'CLEAN', -- CLEAN, DIRTY, OUT_OF_SERVICE
  out_of_service_reason VARCHAR(255),
  out_of_service_note TEXT,
  expected_return_date TIMESTAMP,
  linked_ticket_id VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Reservations table (bookings)
CREATE TABLE IF NOT EXISTS reservations (
  id VARCHAR(255) PRIMARY KEY,
  room_id VARCHAR(255) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED
  guest_count INTEGER NOT NULL DEFAULT 1,
  booking_group_id VARCHAR(255), -- Nullable for individual bookings
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Indexes for availability queries
CREATE INDEX IF NOT EXISTS idx_reservations_room_dates ON reservations(room_id, start_date, end_date) 
WHERE status NOT IN ('CANCELLED', 'CHECKED_OUT');

CREATE INDEX IF NOT EXISTS idx_reservations_status_dates ON reservations(status, start_date)
WHERE status IN ('CONFIRMED', 'CHECKED_IN', 'DRAFT');

CREATE INDEX IF NOT EXISTS idx_reservations_date_range ON reservations(start_date, end_date, room_id)
WHERE status NOT IN ('CANCELLED', 'CHECKED_OUT');

CREATE INDEX IF NOT EXISTS idx_reservations_active_by_room ON reservations(room_id, status, start_date, end_date)
WHERE status IN ('CONFIRMED', 'CHECKED_IN', 'DRAFT');

CREATE INDEX IF NOT EXISTS idx_reservations_arrivals ON reservations(start_date, status, room_id)
WHERE status IN ('CONFIRMED', 'CHECKED_IN');

CREATE INDEX IF NOT EXISTS idx_reservations_departures ON reservations(end_date, status, room_id)
WHERE status IN ('CHECKED_IN', 'CONFIRMED');

CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status) 
WHERE status = 'OUT_OF_SERVICE';

-- Comments
COMMENT ON TABLE rooms IS 'Room inventory with status and condition';
COMMENT ON TABLE reservations IS 'Reservations/bookings for rooms with date ranges and status';
COMMENT ON COLUMN reservations.status IS 'DRAFT, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED';
COMMENT ON COLUMN rooms.status IS 'CLEAN, DIRTY, OUT_OF_SERVICE';

