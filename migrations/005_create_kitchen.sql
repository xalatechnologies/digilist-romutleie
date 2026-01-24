-- Migration: 005_create_kitchen.sql
-- Description: Creates kitchen_items and meal_orders tables for kitchen module
-- Created: 2025-01-XX
-- Depends on: reservations (from migration 003)

-- Kitchen items catalog
CREATE TABLE IF NOT EXISTS kitchen_items (
  id VARCHAR(255) PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  vat_code VARCHAR(10) NOT NULL CHECK (vat_code IN ('VAT_15', 'VAT_25')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Meal orders
CREATE TABLE IF NOT EXISTS meal_orders (
  id VARCHAR(255) PRIMARY KEY,
  reservation_id VARCHAR(255) REFERENCES reservations(id) ON DELETE SET NULL,
  booking_group_id VARCHAR(255),
  kitchen_item_id VARCHAR(255) NOT NULL REFERENCES kitchen_items(id) ON DELETE RESTRICT,
  order_datetime TIMESTAMP NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  serving_location TEXT NOT NULL,
  reference_text TEXT,
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'IN_PREP', 'READY', 'DELIVERED', 'CANCELLED')),
  created_by VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for kitchen_items
CREATE INDEX IF NOT EXISTS idx_kitchen_items_active ON kitchen_items(is_active) WHERE is_active = true;

-- Indexes for meal_orders
CREATE INDEX IF NOT EXISTS idx_meal_orders_datetime ON meal_orders(order_datetime);
CREATE INDEX IF NOT EXISTS idx_meal_orders_status_datetime ON meal_orders(status, order_datetime);
CREATE INDEX IF NOT EXISTS idx_meal_orders_reservation ON meal_orders(reservation_id) WHERE reservation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meal_orders_booking_group ON meal_orders(booking_group_id) WHERE booking_group_id IS NOT NULL;

-- Comments
COMMENT ON TABLE kitchen_items IS 'Kitchen items catalog with pricing and VAT codes';
COMMENT ON TABLE meal_orders IS 'Meal orders linked to reservations or booking groups';
COMMENT ON COLUMN meal_orders.status IS 'PLANNED, IN_PREP, READY, DELIVERED, CANCELLED';
COMMENT ON COLUMN meal_orders.vat_code IS 'VAT_15 or VAT_25';

