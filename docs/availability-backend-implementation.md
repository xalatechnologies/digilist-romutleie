# Availability Engine Backend Implementation

## Overview

This document describes the backend availability engine implementation that serves as the single source of truth for room availability and occupancy states.

## Schema Changes

### Migration: `003_create_rooms_and_reservations.sql`

Creates two core tables:

1. **`rooms`** table:
   - `id`, `number`, `type`, `capacity`, `floor`, `price_per_night`
   - `status` (CLEAN, DIRTY, OUT_OF_SERVICE)
   - `out_of_service_reason`, `out_of_service_note`, `expected_return_date`, `linked_ticket_id`
   - `created_at`, `updated_at`

2. **`reservations`** table:
   - `id`, `room_id`, `start_date`, `end_date`
   - `status` (DRAFT, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED)
   - `guest_count`, `booking_group_id`
   - `check_in_time`, `check_out_time`
   - `customer_name`, `customer_email`, `customer_phone`
   - `created_at`, `updated_at`

### Indexes

The migration includes indexes optimized for:
- Room-specific date range queries
- Date range overlap detection
- Active booking lookups
- Arrival/departure queries
- OUT_OF_SERVICE filtering

## Backend Services

### `AvailabilityService` (`backend/src/services/availabilityService.ts`)

Core service providing:

1. **`getRoomOccupancyState(roomId, from, to)`**
   - Returns: `{ state: FREE|RESERVED|OCCUPIED|DEPARTING|BLOCKED, blocked: boolean, currentReservation?, nextReservation? }`
   - Rules:
     - OUT_OF_SERVICE rooms return `BLOCKED`
     - CANCELLED/CHECKED_OUT reservations are ignored
     - OCCUPIED if CHECKED_IN reservation overlaps "today"
     - RESERVED if CONFIRMED reservation overlaps range
     - DEPARTING if checkout is today

2. **`getRoomNextEvent(roomId, from, to)`**
   - Returns: `{ nextEventType: ARRIVAL|CHECKOUT|FREE|BLOCKED, nextEventAt?, nextEventText }`
   - Determines next arrival or checkout
   - Handles blocked rooms

3. **`validateReservation(roomId, start, end, excludeReservationId?)`**
   - Throws error if:
     - Room is OUT_OF_SERVICE
     - Date range overlaps existing active reservations
   - Used for booking validation

## Backend Endpoints

### `GET /rooms/summary`

Returns list of rooms with occupancy state.

**Query Parameters:**
- `from` (ISO date, default: today)
- `to` (ISO date, default: today + 7 days)
- `status` (CLEAN, DIRTY, OUT_OF_SERVICE)
- `type` (SINGLE, DOUBLE, APARTMENT)
- `q` (search by room number)

**Response:**
```json
{
  "rooms": [
    {
      "id": "room-1",
      "number": "101",
      "type": "SINGLE",
      "capacity": 1,
      "status": "CLEAN",
      "occupancyState": "FREE",
      "blocked": false,
      "nextEventText": "No upcoming events",
      "hasOpenMaintenance": false,
      "hasHousekeepingDue": false
    }
  ],
  "from": "2025-01-15T00:00:00.000Z",
  "to": "2025-01-22T23:59:59.999Z"
}
```

### `GET /rooms/:id/detail`

Returns detailed room information with 7-day outlook.

**Query Parameters:**
- `from` (ISO date, default: today)
- `to` (ISO date, default: today + 7 days)

**Response:**
```json
{
  "id": "room-1",
  "number": "101",
  "type": "SINGLE",
  "status": "CLEAN",
  "occupancyState": "FREE",
  "blocked": false,
  "nextEventText": "No upcoming events",
  "outlook": [
    {
      "date": "2025-01-15",
      "reservations": []
    },
    {
      "date": "2025-01-16",
      "reservations": [
        {
          "id": "res-1",
          "startDate": "2025-01-16T00:00:00.000Z",
          "endDate": "2025-01-18T00:00:00.000Z",
          "status": "CONFIRMED",
          "customerName": "John Doe"
        }
      ]
    }
  ]
}
```

### `PATCH /rooms/:id/status` (existing, enhanced)

Updates room status and logs audit event.

**Request Body:**
```json
{
  "status": "OUT_OF_SERVICE",
  "reason": "Maintenance"
}
```

## Frontend Integration

### `roomApiService.ts`

Frontend service that:
- Fetches room summaries from `GET /rooms/summary`
- Fetches room detail from `GET /rooms/:id/detail`
- Handles errors gracefully (falls back to local store)

### `RoomsView` Updates

- Replaced `store.getRoomSummaries()` with `fetchRoomSummaries()` API call
- Added loading state
- Loads room detail on-demand when room card is clicked
- Maps backend response to `IRoomSummary` format

## Manual Testing Steps

1. **Create reservation in database:**
   ```sql
   INSERT INTO reservations (id, room_id, start_date, end_date, status, guest_count)
   VALUES ('res-1', 'room-1', '2025-01-16', '2025-01-18', 'CONFIRMED', 2);
   ```

2. **Open Rooms page:**
   - Navigate to `/rooms`
   - Verify room cards show correct occupancy state
   - Verify `nextEventText` displays correctly

3. **Click room card:**
   - Verify drawer opens
   - Verify 7-day outlook shows reservation
   - Verify occupancy state matches

4. **Test OUT_OF_SERVICE:**
   ```sql
   UPDATE rooms SET status = 'OUT_OF_SERVICE', out_of_service_reason = 'Maintenance'
   WHERE id = 'room-1';
   ```
   - Refresh Rooms page
   - Verify room shows as blocked
   - Verify `nextEventText` shows blocking reason

## Files Changed

### Backend
- `migrations/003_create_rooms_and_reservations.sql` (NEW)
- `backend/src/models/room.ts` (NEW)
- `backend/src/services/availabilityService.ts` (NEW)
- `backend/src/db/roomQueries.ts` (NEW)
- `backend/src/controllers/roomController.ts` (NEW)
- `backend/src/server.ts` (UPDATED - added routes)

### Frontend
- `services/roomApiService.ts` (NEW)
- `components/Views.tsx` (UPDATED - RoomsView uses backend API)

## Next Steps

1. Implement actual room status updates in `PATCH /rooms/:id/status` (currently just logs audit)
2. Add maintenance ticket integration to `hasOpenMaintenance` flag
3. Add housekeeping integration to `hasHousekeepingDue` flag
4. Wire booking flow to use `validateReservation` before creating reservations
5. Add unit tests for `AvailabilityService`

