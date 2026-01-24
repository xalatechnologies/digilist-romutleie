# Reservation Lifecycle Implementation

## Overview

This document describes the backend implementation for reservation lifecycle management and automatic housekeeping task creation on checkout.

## Schema Changes

### Migration: `004_create_housekeeping_tasks.sql`

Creates `housekeeping_tasks` table:
- `id` (uuid primary key)
- `room_id` (references rooms)
- `reservation_id` (references reservations, nullable, unique for idempotency)
- `due_date` (date)
- `status` (PENDING, IN_PROGRESS, DONE)
- `created_by` (nullable)
- `note` (nullable)
- `created_at`, `updated_at`

**Indexes:**
- `(room_id, due_date)` - for room-specific queries
- `(status, due_date)` - for status filtering
- `UNIQUE (reservation_id)` - prevents duplicate tasks from same checkout

## Backend Services

### `ReservationService` (`backend/src/services/reservationService.ts`)

Handles reservation lifecycle:

1. **`createReservation(req, input)`**
   - Validates availability using `AvailabilityService.validateReservation`
   - Creates reservation with status DRAFT or CONFIRMED
   - Logs audit: `RESERVATION_CREATED`

2. **`updateReservationStatus(req, reservationId, input)`**
   - Validates status transitions:
     - DRAFT → CONFIRMED, CANCELLED
     - CONFIRMED → CHECKED_IN, CANCELLED
     - CHECKED_IN → CHECKED_OUT
     - Terminal states: CHECKED_OUT, CANCELLED
   - Sets `checkInTime`/`checkOutTime` automatically if not provided
   - Logs audit: `RESERVATION_STATUS_CHANGED`
   - Triggers checkout side effects if status becomes CHECKED_OUT

3. **`handleCheckout(req, reservation)`** (private)
   - Creates housekeeping task (idempotent - checks for existing task)
   - Sets room condition to DIRTY (unless OUT_OF_SERVICE)
   - Logs audit events:
     - `HOUSEKEEPING_TASK_CREATED`
     - `ROOM_CONDITION_CHANGED` (if room updated)

### `HousekeepingService` (`backend/src/services/housekeepingService.ts`)

Handles housekeeping operations:

1. **`getTasks(filters)`**
   - Returns tasks with optional filters (date, status, roomId)

2. **`updateTask(req, taskId, input)`**
   - Updates task status (PENDING → IN_PROGRESS → DONE)
   - When marked DONE, sets room to CLEAN (unless OUT_OF_SERVICE)
   - Logs audit: `HOUSEKEEPING_TASK_STATUS_CHANGED` and `HOUSEKEEPING_MARKED_CLEAN`

3. **`updateRoomCondition(req, roomId, condition)`**
   - Allows HOUSEKEEPING role to set CLEAN or DIRTY
   - Blocks if room is OUT_OF_SERVICE
   - Logs audit: `HOUSEKEEPING_MARKED_CLEAN` or `HOUSEKEEPING_MARKED_DIRTY`

## Backend Endpoints

### Reservation Endpoints

#### `POST /reservations`
**Required role:** BOOKING_STAFF or ADMIN

**Request:**
```json
{
  "roomId": "room-1",
  "startDate": "2025-01-16",
  "endDate": "2025-01-18",
  "status": "CONFIRMED",
  "guestCount": 2,
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "+47 123 45 678"
}
```

**Response:**
```json
{
  "id": "res-123",
  "roomId": "room-1",
  "startDate": "2025-01-16",
  "endDate": "2025-01-18",
  "status": "CONFIRMED",
  "guestCount": 2,
  "checkInTime": null,
  "checkOutTime": null,
  "createdAt": "2025-01-15T10:00:00Z"
}
```

#### `PATCH /reservations/:id/status`
**Required role:** BOOKING_STAFF or ADMIN

**Request:**
```json
{
  "status": "CHECKED_OUT"
}
```

**Response:** Updated reservation object

**Error (400) for invalid transition:**
```json
{
  "error": "Failed to update reservation status",
  "message": "Invalid status transition: CONFIRMED → CHECKED_OUT. Valid transitions from CONFIRMED: CHECKED_IN, CANCELLED"
}
```

### Housekeeping Endpoints

#### `GET /housekeeping/tasks`
**Required role:** HOUSEKEEPING or ADMIN

**Query Parameters:**
- `date` (YYYY-MM-DD)
- `status` (PENDING, IN_PROGRESS, DONE)
- `roomId`

**Response:**
```json
{
  "tasks": [
    {
      "id": "task-123",
      "roomId": "room-1",
      "reservationId": "res-123",
      "dueDate": "2025-01-18",
      "status": "PENDING",
      "createdAt": "2025-01-18T11:00:00Z"
    }
  ]
}
```

#### `PATCH /housekeeping/tasks/:id`
**Required role:** HOUSEKEEPING or ADMIN

**Request:**
```json
{
  "status": "DONE"
}
```

**Response:** Updated task object

**Side effect:** Room condition set to CLEAN (unless OUT_OF_SERVICE)

#### `PATCH /rooms/:id/condition`
**Required role:** HOUSEKEEPING or ADMIN

**Request:**
```json
{
  "condition": "CLEAN"
}
```

**Response:**
```json
{
  "success": true,
  "roomId": "room-1",
  "condition": "CLEAN",
  "message": "Room condition updated"
}
```

## RBAC Enforcement

- **BOOKING_STAFF**: Can create reservations and change status (CONFIRMED, CHECKED_IN, CHECKED_OUT)
- **HOUSEKEEPING**: Can update housekeeping tasks and set room condition (CLEAN/DIRTY only)
- **ADMIN**: Full access to all endpoints
- **OUT_OF_SERVICE changes**: Remain ADMIN/MAINTENANCE only (enforced in room status endpoint)

## Frontend Integration

### `reservationApiService.ts`
- `createReservation(input)` - POST /reservations
- `updateReservationStatus(reservationId, input)` - PATCH /reservations/:id/status

### `housekeepingApiService.ts`
- `getHousekeepingTasks(params)` - GET /housekeeping/tasks
- `updateHousekeepingTask(taskId, input)` - PATCH /housekeeping/tasks/:id
- `updateRoomCondition(roomId, condition)` - PATCH /rooms/:id/condition

## Manual Testing Steps

### 1. Create Reservation → Check-in → Check-out

```bash
# 1. Create reservation
curl -X POST http://localhost:3001/reservations \
  -H "Content-Type: application/json" \
  -H "x-user-id: staff-1" \
  -H "x-user-roles: BOOKING_STAFF" \
  -d '{
    "roomId": "room-1",
    "startDate": "2025-01-16",
    "endDate": "2025-01-18",
    "status": "CONFIRMED",
    "guestCount": 2,
    "customerName": "John Doe"
  }'

# Response: reservation with id "res-123"

# 2. Check in
curl -X PATCH http://localhost:3001/reservations/res-123/status \
  -H "Content-Type: application/json" \
  -H "x-user-id: staff-1" \
  -H "x-user-roles: BOOKING_STAFF" \
  -d '{"status": "CHECKED_IN"}'

# 3. Check out
curl -X PATCH http://localhost:3001/reservations/res-123/status \
  -H "Content-Type: application/json" \
  -H "x-user-id: staff-1" \
  -H "x-user-roles: BOOKING_STAFF" \
  -d '{"status": "CHECKED_OUT"}'
```

**Verify in database:**
```sql
-- Check housekeeping task created
SELECT * FROM housekeeping_tasks WHERE reservation_id = 'res-123';
-- Should return 1 row with status = 'PENDING'

-- Check room condition
SELECT status FROM rooms WHERE id = 'room-1';
-- Should be 'DIRTY' (unless OUT_OF_SERVICE)

-- Check audit logs
SELECT action, entity_type, entity_id, message 
FROM audit_logs 
WHERE entity_id IN ('res-123', 'room-1') 
ORDER BY created_at DESC;
-- Should see:
-- HOUSEKEEPING_TASK_CREATED (entity_type=HOUSEKEEPING_TASK)
-- ROOM_CONDITION_CHANGED (entity_type=ROOM)
-- RESERVATION_STATUS_CHANGED (entity_type=RESERVATION, 3 times)
```

### 2. Complete Housekeeping Task

```bash
# Get tasks
curl http://localhost:3001/housekeeping/tasks?date=2025-01-18 \
  -H "x-user-id: housekeeping-1" \
  -H "x-user-roles: HOUSEKEEPING"

# Mark task as DONE
curl -X PATCH http://localhost:3001/housekeeping/tasks/task-123 \
  -H "Content-Type: application/json" \
  -H "x-user-id: housekeeping-1" \
  -H "x-user-roles: HOUSEKEEPING" \
  -d '{"status": "DONE"}'
```

**Verify:**
```sql
-- Room should be CLEAN
SELECT status FROM rooms WHERE id = 'room-1';
-- Should be 'CLEAN'

-- Audit log
SELECT action, message FROM audit_logs 
WHERE entity_id = 'room-1' 
ORDER BY created_at DESC LIMIT 1;
-- Should see HOUSEKEEPING_MARKED_CLEAN
```

### 3. Test Invalid Status Transition

```bash
curl -X PATCH http://localhost:3001/reservations/res-123/status \
  -H "Content-Type: application/json" \
  -H "x-user-id: staff-1" \
  -H "x-user-roles: BOOKING_STAFF" \
  -d '{"status": "CONFIRMED"}'
```

**Expected:** 400 error with message about invalid transition

### 4. Test Idempotency (Checkout Twice)

```bash
# Check out again (should not create duplicate task)
curl -X PATCH http://localhost:3001/reservations/res-123/status \
  -H "Content-Type: application/json" \
  -H "x-user-id: staff-1" \
  -H "x-user-roles: BOOKING_STAFF" \
  -d '{"status": "CHECKED_OUT"}'
```

**Verify:**
```sql
-- Should still be only 1 task
SELECT COUNT(*) FROM housekeeping_tasks WHERE reservation_id = 'res-123';
-- Should return 1
```

## Sample Audit Log Entries

### Reservation Created
```json
{
  "action": "RESERVATION_CREATED",
  "entityType": "RESERVATION",
  "entityId": "res-123",
  "message": "Reservation created for room room-1 (2025-01-16 to 2025-01-18)",
  "after": {
    "status": "CONFIRMED",
    "roomId": "room-1",
    "startDate": "2025-01-16",
    "endDate": "2025-01-18"
  }
}
```

### Status Changed to CHECKED_OUT
```json
{
  "action": "RESERVATION_STATUS_CHANGED",
  "entityType": "RESERVATION",
  "entityId": "res-123",
  "message": "Reservation status changed: CHECKED_IN → CHECKED_OUT",
  "before": {
    "status": "CHECKED_IN",
    "checkOutTime": null
  },
  "after": {
    "status": "CHECKED_OUT",
    "checkOutTime": "2025-01-18T11:00:00Z"
  }
}
```

### Housekeeping Task Created
```json
{
  "action": "HOUSEKEEPING_TASK_CREATED",
  "entityType": "HOUSEKEEPING_TASK",
  "entityId": "task-123",
  "message": "Housekeeping task created for room room-1 (checkout from reservation res-123)",
  "after": {
    "roomId": "room-1",
    "reservationId": "res-123",
    "dueDate": "2025-01-18"
  },
  "metadata": {
    "reservationId": "res-123",
    "triggeredBy": "CHECKOUT"
  }
}
```

### Room Condition Changed to DIRTY
```json
{
  "action": "ROOM_CONDITION_CHANGED",
  "entityType": "ROOM",
  "entityId": "room-1",
  "message": "Room condition changed to DIRTY after checkout (reservation res-123)",
  "before": {
    "status": "CLEAN"
  },
  "after": {
    "status": "DIRTY"
  },
  "metadata": {
    "reservationId": "res-123",
    "triggeredBy": "CHECKOUT"
  }
}
```

### Housekeeping Task Completed
```json
{
  "action": "HOUSEKEEPING_MARKED_CLEAN",
  "entityType": "ROOM",
  "entityId": "room-1",
  "message": "Room condition changed to CLEAN after housekeeping task task-123 completed",
  "before": {
    "status": "DIRTY"
  },
  "after": {
    "status": "CLEAN"
  },
  "metadata": {
    "taskId": "task-123",
    "reservationId": "res-123"
  }
}
```

## Files Changed

### Backend
- `migrations/004_create_housekeeping_tasks.sql` (NEW)
- `backend/src/models/reservation.ts` (NEW)
- `backend/src/db/reservationQueries.ts` (NEW)
- `backend/src/db/housekeepingQueries.ts` (NEW)
- `backend/src/services/reservationService.ts` (NEW)
- `backend/src/services/housekeepingService.ts` (NEW)
- `backend/src/middleware/rbac.ts` (NEW)
- `backend/src/controllers/reservationController.ts` (NEW)
- `backend/src/controllers/housekeepingController.ts` (NEW)
- `backend/src/server.ts` (UPDATED - added routes)

### Frontend
- `services/reservationApiService.ts` (NEW)
- `services/housekeepingApiService.ts` (NEW)

## Next Steps

1. Wire frontend BookingView to use `reservationApiService` for check-in/check-out
2. Wire frontend HousekeepingView to use `housekeepingApiService` for task management
3. Add unit tests for status transition validation
4. Add integration tests for checkout side effects

