-- Migration: 002_add_availability_indexes.sql
-- Description: Adds indexes for efficient availability and date-range queries
-- Created: 2025-01-XX
-- Depends on: bookings table, rooms table

-- Index for room availability queries
-- Supports: "Get all bookings for room X in date range"
-- Used by: checkOverlap, getRoomOccupancyState
CREATE INDEX IF NOT EXISTS idx_bookings_room_dates ON bookings(room_id, start_date, end_date) 
WHERE status NOT IN ('CANCELLED', 'CHECKED_OUT');

-- Index for date range overlap queries
-- Supports: "Find all bookings overlapping with date range"
-- Used by: checkOverlap, getAvailableRooms
CREATE INDEX IF NOT EXISTS idx_bookings_date_range ON bookings(start_date, end_date, room_id)
WHERE status NOT IN ('CANCELLED', 'CHECKED_OUT');

-- Index for room status queries
-- Supports: "Get all OUT_OF_SERVICE rooms"
-- Used by: isBookable
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status) 
WHERE status = 'OUT_OF_SERVICE';

-- Index for active bookings by room
-- Supports: "Get current/active booking for room"
-- Used by: getRoomOccupancyState
CREATE INDEX IF NOT EXISTS idx_bookings_active_by_room ON bookings(room_id, status, start_date, end_date)
WHERE status IN ('CONFIRMED', 'CHECKED_IN', 'DRAFT');

-- Index for check-in/check-out date queries
-- Supports: "Get all arrivals/departures on a specific date"
CREATE INDEX IF NOT EXISTS idx_bookings_arrivals ON bookings(start_date, status, room_id)
WHERE status IN ('CONFIRMED', 'CHECKED_IN');

CREATE INDEX IF NOT EXISTS idx_bookings_departures ON bookings(end_date, status, room_id)
WHERE status IN ('CHECKED_IN', 'CONFIRMED');

-- Composite index for room availability summary
-- Supports: "Get room summary with occupancy state"
CREATE INDEX IF NOT EXISTS idx_bookings_room_summary ON bookings(room_id, status, start_date, end_date, check_in_time, check_out_time)
WHERE status NOT IN ('CANCELLED', 'CHECKED_OUT');

-- Comments for documentation
COMMENT ON INDEX idx_bookings_room_dates IS 'Optimizes room-specific date range queries for availability checking';
COMMENT ON INDEX idx_bookings_date_range IS 'Optimizes date range overlap detection across all rooms';
COMMENT ON INDEX idx_rooms_status IS 'Optimizes OUT_OF_SERVICE room filtering';
COMMENT ON INDEX idx_bookings_active_by_room IS 'Optimizes active booking lookups for occupancy state';
COMMENT ON INDEX idx_bookings_arrivals IS 'Optimizes arrival date queries';
COMMENT ON INDEX idx_bookings_departures IS 'Optimizes departure date queries';
COMMENT ON INDEX idx_bookings_room_summary IS 'Optimizes room summary queries with full booking context';

