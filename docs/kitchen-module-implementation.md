# Kitchen Module Implementation

## Overview

This document describes the backend and frontend implementation for the Kitchen module, including item catalog, meal orders, and kitchen board view.

## Schema Changes

### Migration: `005_create_kitchen.sql`

Creates two tables:

1. **`kitchen_items`** table:
   - `id` (uuid primary key)
   - `name`, `description` (text)
   - `unit_price` (numeric, >= 0)
   - `vat_code` (VAT_15 or VAT_25, CHECK constraint)
   - `is_active` (boolean, default true)
   - `created_at`, `updated_at`

2. **`meal_orders`** table:
   - `id` (uuid primary key)
   - `reservation_id` (references reservations, nullable)
   - `booking_group_id` (nullable, for future use)
   - `kitchen_item_id` (references kitchen_items, NOT NULL)
   - `order_datetime` (timestamp, NOT NULL)
   - `quantity` (integer, >= 1, CHECK constraint)
   - `serving_location` (text, NOT NULL)
   - `reference_text` (text, nullable)
   - `notes` (text, nullable)
   - `status` (PLANNED, IN_PREP, READY, DELIVERED, CANCELLED, CHECK constraint)
   - `created_by` (text, nullable)
   - `created_at`, `updated_at`

**Indexes:**
- `kitchen_items(is_active)` - for active items filtering
- `meal_orders(order_datetime)` - for date range queries
- `meal_orders(status, order_datetime)` - for board view filtering
- `meal_orders(reservation_id)` - for reservation-linked queries

## Backend Services

### `KitchenService` (`backend/src/services/kitchenService.ts`)

Handles kitchen operations:

1. **Kitchen Items:**
   - `getItems(activeOnly)` - Get items, optionally filtered to active only
   - `getItemById(id)` - Get single item
   - `createItem(req, input)` - Create item with audit log
   - `updateItem(req, id, input)` - Update item with audit log (detects deactivation)

2. **Meal Orders:**
   - `getOrders(filters)` - Get orders with optional filters
   - `getOrderById(id)` - Get single order
   - `createOrder(req, input)` - Create order (validates item is active) with audit log
   - `updateOrder(req, id, input)` - Update limited fields (location, reference, notes) with audit log
   - `updateOrderStatus(req, id, input)` - Update status with transition validation and audit log
   - `getBoard(filters)` - Get optimized board view (joins with items for names)

**Status Transitions:**
- PLANNED → IN_PREP, CANCELLED
- IN_PREP → READY, CANCELLED
- READY → DELIVERED
- DELIVERED, CANCELLED are terminal states

## Backend Endpoints

### Kitchen Items

#### `GET /kitchen/items?active=true`
**No auth required** (public catalog)

**Response:**
```json
{
  "items": [
    {
      "id": "item-1",
      "name": "Breakfast",
      "description": "Continental breakfast",
      "unitPrice": 150.00,
      "vatCode": "VAT_15",
      "isActive": true,
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

#### `POST /kitchen/items`
**Required role:** KITCHEN or ADMIN

**Request:**
```json
{
  "name": "Breakfast",
  "description": "Continental breakfast",
  "unitPrice": 150.00,
  "vatCode": "VAT_15",
  "isActive": true
}
```

**Response:** Created item object

#### `PATCH /kitchen/items/:id`
**Required role:** KITCHEN or ADMIN

**Request:**
```json
{
  "name": "Updated Breakfast",
  "unitPrice": 160.00,
  "isActive": false
}
```

**Response:** Updated item object

### Meal Orders

#### `GET /kitchen/orders?from=&to=&status=&reservationId=&bookingGroupId=&q=`
**No auth required** (read access)

**Response:**
```json
{
  "orders": [
    {
      "id": "order-1",
      "reservationId": "res-123",
      "kitchenItemId": "item-1",
      "orderDateTime": "2025-01-20T08:00:00Z",
      "quantity": 24,
      "servingLocation": "Room 101",
      "referenceText": "Group booking ABC",
      "notes": "No nuts",
      "status": "PLANNED",
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

#### `POST /kitchen/orders`
**Required role:** BOOKING_STAFF or ADMIN

**Request:**
```json
{
  "reservationId": "res-123",
  "kitchenItemId": "item-1",
  "orderDateTime": "2025-01-20T08:00:00Z",
  "quantity": 24,
  "servingLocation": "Room 101",
  "referenceText": "Group booking ABC",
  "notes": "No nuts"
}
```

**Response:** Created order object

**Error (400) if item is inactive:**
```json
{
  "error": "Failed to create meal order",
  "message": "Cannot create order: kitchen item Breakfast is inactive"
}
```

#### `PATCH /kitchen/orders/:id`
**Required role:** BOOKING_STAFF or ADMIN

**Request:**
```json
{
  "servingLocation": "Room 102",
  "referenceText": "Updated reference",
  "notes": "Updated notes"
}
```

**Response:** Updated order object

#### `PATCH /kitchen/orders/:id/status`
**Required role:** KITCHEN or ADMIN

**Request:**
```json
{
  "status": "READY"
}
```

**Response:** Updated order object

**Error (400) for invalid transition:**
```json
{
  "error": "Failed to update meal order status",
  "message": "Invalid status transition: PLANNED → DELIVERED. Valid transitions from PLANNED: IN_PREP, CANCELLED"
}
```

### Kitchen Board

#### `GET /kitchen/board?from=&to=&status=`
**No auth required** (public board view)

**Response:**
```json
{
  "board": [
    {
      "orderId": "order-1",
      "orderDateTime": "2025-01-20T08:00:00Z",
      "itemName": "Breakfast",
      "quantity": 24,
      "location": "Room 101",
      "referenceText": "Group booking ABC",
      "notes": "No nuts",
      "status": "PLANNED"
    }
  ]
}
```

## Audit Events

All mutations create audit logs with human-readable messages:

### Kitchen Items
- **KITCHEN_ITEM_CREATED**: "Kitchen item created: Breakfast (150 NOK, VAT VAT_15)"
- **KITCHEN_ITEM_UPDATED**: "Kitchen item updated: Breakfast"
- **KITCHEN_ITEM_DEACTIVATED**: "Kitchen item deactivated: Breakfast"

### Meal Orders
- **MEAL_ORDER_CREATED**: "Meal order created: Breakfast × 24 (2025-01-20 08:00)"
- **MEAL_ORDER_UPDATED**: "Meal order updated (order order-1)"
- **MEAL_ORDER_STATUS_CHANGED**: "Meal order status changed: PLANNED → READY (Breakfast × 24)"
- **MEAL_ORDER_CANCELLED**: "Meal order status changed: IN_PREP → CANCELLED (Breakfast × 24)"

## Frontend Integration

### `kitchenApiService.ts`

Frontend service providing:
- `getKitchenItems(activeOnly)` - GET /kitchen/items
- `createKitchenItem(input)` - POST /kitchen/items
- `updateKitchenItem(itemId, input)` - PATCH /kitchen/items/:id
- `getMealOrders(params)` - GET /kitchen/orders
- `createMealOrder(input)` - POST /kitchen/orders
- `updateMealOrder(orderId, input)` - PATCH /kitchen/orders/:id
- `updateMealOrderStatus(orderId, status)` - PATCH /kitchen/orders/:id/status
- `getKitchenBoard(params)` - GET /kitchen/board

## Manual Testing Steps

### 1. Create Kitchen Item

```bash
curl -X POST http://localhost:3001/kitchen/items \
  -H "Content-Type: application/json" \
  -H "x-user-id: kitchen-1" \
  -H "x-user-roles: KITCHEN" \
  -d '{
    "name": "Breakfast",
    "description": "Continental breakfast",
    "unitPrice": 150.00,
    "vatCode": "VAT_15",
    "isActive": true
  }'
```

**Response:** Item with id "item-1"

### 2. Create Meal Order Linked to Reservation

```bash
curl -X POST http://localhost:3001/kitchen/orders \
  -H "Content-Type: application/json" \
  -H "x-user-id: staff-1" \
  -H "x-user-roles: BOOKING_STAFF" \
  -d '{
    "reservationId": "res-123",
    "kitchenItemId": "item-1",
    "orderDateTime": "2025-01-20T08:00:00Z",
    "quantity": 24,
    "servingLocation": "Room 101",
    "referenceText": "Group booking ABC",
    "notes": "No nuts"
  }'
```

**Response:** Order with id "order-1"

### 3. Fetch Kitchen Board

```bash
# Next 24 hours
curl "http://localhost:3001/kitchen/board?from=2025-01-20T00:00:00Z&to=2025-01-21T00:00:00Z"

# Next 7 days
curl "http://localhost:3001/kitchen/board?from=2025-01-20T00:00:00Z&to=2025-01-27T00:00:00Z"
```

**Response:** Board items with item names pre-joined

### 4. Update Order Status

```bash
# Start prep
curl -X PATCH http://localhost:3001/kitchen/orders/order-1/status \
  -H "Content-Type: application/json" \
  -H "x-user-id: kitchen-1" \
  -H "x-user-roles: KITCHEN" \
  -d '{"status": "IN_PREP"}'

# Mark ready
curl -X PATCH http://localhost:3001/kitchen/orders/order-1/status \
  -H "Content-Type: application/json" \
  -H "x-user-id: kitchen-1" \
  -H "x-user-roles: KITCHEN" \
  -d '{"status": "READY"}'

# Mark delivered
curl -X PATCH http://localhost:3001/kitchen/orders/order-1/status \
  -H "Content-Type: application/json" \
  -H "x-user-id: kitchen-1" \
  -H "x-user-roles: KITCHEN" \
  -d '{"status": "DELIVERED"}'
```

### 5. Verify Audit Logs

```sql
-- Check audit logs for kitchen operations
SELECT action, entity_type, entity_id, message, created_at
FROM audit_logs
WHERE entity_type IN ('KITCHEN_ITEM', 'MEAL_ORDER')
ORDER BY created_at DESC
LIMIT 10;

-- Expected entries:
-- KITCHEN_ITEM_CREATED (entity_type=KITCHEN_ITEM, entity_id=item-1)
-- MEAL_ORDER_CREATED (entity_type=MEAL_ORDER, entity_id=order-1)
-- MEAL_ORDER_STATUS_CHANGED (entity_type=MEAL_ORDER, entity_id=order-1, 3 times)
```

### 6. Test Invalid Status Transition

```bash
# Try to skip from PLANNED to DELIVERED (should fail)
curl -X PATCH http://localhost:3001/kitchen/orders/order-1/status \
  -H "Content-Type: application/json" \
  -H "x-user-id: kitchen-1" \
  -H "x-user-roles: KITCHEN" \
  -d '{"status": "DELIVERED"}'
```

**Expected:** 400 error with message about invalid transition

### 7. Test Inactive Item Block

```bash
# Deactivate item
curl -X PATCH http://localhost:3001/kitchen/items/item-1 \
  -H "Content-Type: application/json" \
  -H "x-user-id: kitchen-1" \
  -H "x-user-roles: KITCHEN" \
  -d '{"isActive": false}'

# Try to create order with inactive item (should fail)
curl -X POST http://localhost:3001/kitchen/orders \
  -H "Content-Type: application/json" \
  -H "x-user-id: staff-1" \
  -H "x-user-roles: BOOKING_STAFF" \
  -d '{
    "kitchenItemId": "item-1",
    "orderDateTime": "2025-01-21T08:00:00Z",
    "quantity": 10,
    "servingLocation": "Room 102"
  }'
```

**Expected:** 400 error: "Cannot create order: kitchen item Breakfast is inactive"

## Sample Audit Log Entries

### Kitchen Item Created
```json
{
  "action": "KITCHEN_ITEM_CREATED",
  "entityType": "KITCHEN_ITEM",
  "entityId": "item-1",
  "message": "Kitchen item created: Breakfast (150 NOK, VAT VAT_15)",
  "after": {
    "name": "Breakfast",
    "unitPrice": 150.00,
    "vatCode": "VAT_15",
    "isActive": true
  }
}
```

### Meal Order Created
```json
{
  "action": "MEAL_ORDER_CREATED",
  "entityType": "MEAL_ORDER",
  "entityId": "order-1",
  "message": "Meal order created: Breakfast × 24 (2025-01-20 08:00)",
  "after": {
    "kitchenItemId": "item-1",
    "itemName": "Breakfast",
    "quantity": 24,
    "orderDateTime": "2025-01-20T08:00:00Z",
    "servingLocation": "Room 101",
    "status": "PLANNED"
  },
  "metadata": {
    "reservationId": "res-123"
  }
}
```

### Status Changed
```json
{
  "action": "MEAL_ORDER_STATUS_CHANGED",
  "entityType": "MEAL_ORDER",
  "entityId": "order-1",
  "message": "Meal order status changed: PLANNED → READY (Breakfast × 24)",
  "before": {
    "status": "PLANNED"
  },
  "after": {
    "status": "READY"
  }
}
```

## Files Changed

### Backend
- `migrations/005_create_kitchen.sql` (NEW)
- `backend/src/models/kitchen.ts` (NEW)
- `backend/src/db/kitchenQueries.ts` (NEW)
- `backend/src/services/kitchenService.ts` (NEW)
- `backend/src/controllers/kitchenController.ts` (NEW)
- `backend/src/server.ts` (UPDATED - added routes)

### Frontend
- `services/kitchenApiService.ts` (NEW)

### Documentation
- `docs/kitchen-module-implementation.md` (NEW)
- `migrations/README.md` (UPDATED)

## Next Steps

1. Wire frontend Kitchen Items page to use `kitchenApiService.getKitchenItems()` and create/update methods
2. Wire frontend Meal Orders page to use `kitchenApiService.getMealOrders()` and create/update methods
3. Wire frontend Kitchen Board view to use `kitchenApiService.getKitchenBoard()` with polling (every 10-30 seconds)
4. Add frontend status update handlers that call `kitchenApiService.updateMealOrderStatus()`

