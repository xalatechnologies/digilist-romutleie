# Dashboard Summary Implementation

## Overview

This document describes the Dashboard Summary endpoint that aggregates operational data from multiple tables to power the dashboard UI without requiring heavy frontend joins.

## Endpoint

### `GET /dashboard/summary?date=YYYY-MM-DD`

**No authentication required** (but RBAC filtering applies based on roles)

**Query Parameters:**
- `date` (optional): Date in YYYY-MM-DD format. Defaults to today if not provided.

**Response:** Dashboard summary with role-based filtering

## Response Structure

```typescript
{
  date: "YYYY-MM-DD",
  rooms: {
    total: number,
    cleanCount: number,
    dirtyCount: number,
    outOfServiceCount: number
  },
  occupancy: {
    occupiedToday: number,
    reservedToday: number,
    freeToday: number
  },
  arrivals: {
    count: number,
    items: Array<{
      reservationId: string,
      roomId: string,
      roomNumber: string,
      customerName?: string,  // Optional if not in reservations
      startDate: string,
      status: string
    }>
  },
  departures: {
    count: number,
    items: Array<{
      reservationId: string,
      roomId: string,
      roomNumber: string,
      endDate: string,
      status: string
    }>
  },
  housekeeping: {
    tasksDueToday: number,
    tasksPending: number,
    items: Array<{
      taskId: string,
      roomId: string,
      roomNumber: string,
      status: string,
      dueDate: string
    }>
  },
  kitchen?: {  // Only for ADMIN, BOOKING_STAFF, KITCHEN
    ordersNext24h: number,
    items: Array<{
      orderId: string,
      orderDateTime: string,
      itemName: string,
      quantity: number,
      location: string,
      status: string
    }>
  },
  billing?: {  // Only for ADMIN, FINANCE
    invoicesDraft: number,
    invoicesSent: number,
    invoicesPaid: number,
    vismaExportsPending: number,
    vismaExportsFailed: number
  }
}
```

## RBAC Filtering

The endpoint returns different data blocks based on user roles:

### ADMIN
- Full payload (all blocks)

### BOOKING_STAFF
- rooms, occupancy, arrivals, departures, housekeeping, kitchen
- **Excludes:** billing

### FINANCE
- rooms, occupancy, arrivals, departures, housekeeping, billing
- **Excludes:** kitchen

### HOUSEKEEPING
- rooms, housekeeping, arrivals, departures
- **Excludes:** kitchen, billing

### KITCHEN
- kitchen, arrivals, departures (minimal)
- **Excludes:** rooms details, billing

### No Role / Unauthenticated
- rooms, occupancy, arrivals, departures, housekeeping
- **Excludes:** kitchen, billing

## Aggregation Logic

### Room Counts
- Counts rooms by status (CLEAN, DIRTY, OUT_OF_SERVICE)
- Uses SQL aggregation with FILTER clauses

### Occupancy Counts
- **occupiedToday**: Reservations with `status=CHECKED_IN` where date is within `[start_date, end_date)`
- **reservedToday**: Reservations with `status=CONFIRMED` where date overlaps reservation range
- **freeToday**: `total - occupied - reserved - outOfService`
  - **Assumption**: Free rooms = total rooms minus occupied, reserved, and out-of-service rooms
  - Uses `Math.max(0, ...)` to ensure non-negative

### Arrivals
- Reservations where `DATE(start_date) = date` and `status IN ('CONFIRMED', 'CHECKED_IN')`
- Joins with `rooms` table to get `roomNumber`
- Includes `customerName` if present in reservations table (optional)

### Departures
- Reservations where `DATE(end_date) = date` and `status IN ('CHECKED_IN', 'CHECKED_OUT')`
- Joins with `rooms` table to get `roomNumber`

### Housekeeping Tasks
- Tasks where `DATE(due_date) = date`
- `tasksDueToday`: Total count
- `tasksPending`: Count where `status != 'DONE'`
- Joins with `rooms` table to get `roomNumber`

### Kitchen Orders
- Orders where `order_datetime` is within next 24 hours from date start
- Excludes `status = 'CANCELLED'`
- Joins with `kitchen_items` to get `itemName`

### Billing Summary
- Invoice counts by status (DRAFT, SENT, PAID)
- Visma export counts (PENDING, FAILED)

## Performance Considerations

- Uses SQL aggregation (COUNT, FILTER) instead of loading full datasets
- Leverages existing indexes:
  - `reservations(status, start_date)`
  - `reservations(status, end_date)`
  - `housekeeping_tasks(room_id, due_date)`
  - `meal_orders(order_datetime)`
  - `invoices(status)`
  - `accounting_exports(invoice_id, status)`
- Parallel queries where possible (Promise.all)
- Minimal payload (only necessary fields)

## Assumptions

1. **Free Rooms Calculation:**
   - `freeToday = total - occupied - reserved - outOfService`
   - This assumes rooms are either occupied, reserved, or free
   - Does not account for rooms that might be in transition states
   - Uses `Math.max(0, ...)` to prevent negative values

2. **Date Handling:**
   - Uses `DATE()` function for date comparisons (timezone-aware)
   - Arrivals/departures use exact date match
   - Occupancy uses range overlap check

3. **Customer Name:**
   - Optional field in reservations table
   - If not present, `customerName` is omitted from response (not set to empty string)

4. **Kitchen Orders:**
   - "Next 24h" means from `date 00:00:00` to `date+1 00:00:00`
   - Excludes cancelled orders

## Manual Testing Steps

### 1. Test as ADMIN (Full Payload)

```bash
curl "http://localhost:3001/dashboard/summary?date=2025-01-15" \
  -H "x-user-id: admin-1" \
  -H "x-user-roles: ADMIN"
```

**Expected Response:**
```json
{
  "date": "2025-01-15",
  "rooms": {
    "total": 50,
    "cleanCount": 30,
    "dirtyCount": 15,
    "outOfServiceCount": 5
  },
  "occupancy": {
    "occupiedToday": 20,
    "reservedToday": 10,
    "freeToday": 15
  },
  "arrivals": {
    "count": 5,
    "items": [
      {
        "reservationId": "res-123",
        "roomId": "room-1",
        "roomNumber": "101",
        "customerName": "John Doe",
        "startDate": "2025-01-15T14:00:00Z",
        "status": "CONFIRMED"
      }
    ]
  },
  "departures": {
    "count": 3,
    "items": [
      {
        "reservationId": "res-124",
        "roomId": "room-2",
        "roomNumber": "102",
        "endDate": "2025-01-15T11:00:00Z",
        "status": "CHECKED_OUT"
      }
    ]
  },
  "housekeeping": {
    "tasksDueToday": 8,
    "tasksPending": 5,
    "items": [...]
  },
  "kitchen": {
    "ordersNext24h": 12,
    "items": [...]
  },
  "billing": {
    "invoicesDraft": 5,
    "invoicesSent": 10,
    "invoicesPaid": 25,
    "vismaExportsPending": 2,
    "vismaExportsFailed": 1
  }
}
```

### 2. Test as BOOKING_STAFF (No Billing)

```bash
curl "http://localhost:3001/dashboard/summary?date=2025-01-15" \
  -H "x-user-id: staff-1" \
  -H "x-user-roles: BOOKING_STAFF"
```

**Expected:** Same as ADMIN but **without** `billing` block

### 3. Test as FINANCE (No Kitchen)

```bash
curl "http://localhost:3001/dashboard/summary?date=2025-01-15" \
  -H "x-user-id: finance-1" \
  -H "x-user-roles: FINANCE"
```

**Expected:** Same as ADMIN but **without** `kitchen` block

### 4. Test as HOUSEKEEPING (Minimal)

```bash
curl "http://localhost:3001/dashboard/summary?date=2025-01-15" \
  -H "x-user-id: housekeeping-1" \
  -H "x-user-roles: HOUSEKEEPING"
```

**Expected:** Only `rooms`, `housekeeping`, `arrivals`, `departures` blocks

### 5. Test Default Date (Today)

```bash
curl "http://localhost:3001/dashboard/summary" \
  -H "x-user-id: admin-1" \
  -H "x-user-roles: ADMIN"
```

**Expected:** Uses today's date

### 6. Test Invalid Date Format

```bash
curl "http://localhost:3001/dashboard/summary?date=2025/01/15" \
  -H "x-user-id: admin-1" \
  -H "x-user-roles: ADMIN"
```

**Expected:** 400 error with message "Date must be in YYYY-MM-DD format"

## Sample Response (ADMIN)

```json
{
  "date": "2025-01-15",
  "rooms": {
    "total": 50,
    "cleanCount": 30,
    "dirtyCount": 15,
    "outOfServiceCount": 5
  },
  "occupancy": {
    "occupiedToday": 20,
    "reservedToday": 10,
    "freeToday": 15
  },
  "arrivals": {
    "count": 5,
    "items": [
      {
        "reservationId": "res-123",
        "roomId": "room-1",
        "roomNumber": "101",
        "customerName": "John Doe",
        "startDate": "2025-01-15T14:00:00Z",
        "status": "CONFIRMED"
      },
      {
        "reservationId": "res-124",
        "roomId": "room-2",
        "roomNumber": "102",
        "startDate": "2025-01-15T16:00:00Z",
        "status": "CONFIRMED"
      }
    ]
  },
  "departures": {
    "count": 3,
    "items": [
      {
        "reservationId": "res-125",
        "roomId": "room-3",
        "roomNumber": "103",
        "endDate": "2025-01-15T11:00:00Z",
        "status": "CHECKED_OUT"
      }
    ]
  },
  "housekeeping": {
    "tasksDueToday": 8,
    "tasksPending": 5,
    "items": [
      {
        "taskId": "task-1",
        "roomId": "room-1",
        "roomNumber": "101",
        "status": "PENDING",
        "dueDate": "2025-01-15T12:00:00Z"
      }
    ]
  },
  "kitchen": {
    "ordersNext24h": 12,
    "items": [
      {
        "orderId": "order-1",
        "orderDateTime": "2025-01-15T08:00:00Z",
        "itemName": "Breakfast",
        "quantity": 24,
        "location": "Room 101",
        "status": "PLANNED"
      }
    ]
  },
  "billing": {
    "invoicesDraft": 5,
    "invoicesSent": 10,
    "invoicesPaid": 25,
    "vismaExportsPending": 2,
    "vismaExportsFailed": 1
  }
}
```

## Files Changed

### Backend
- `backend/src/models/dashboard.ts` (NEW)
- `backend/src/db/dashboardQueries.ts` (NEW)
- `backend/src/services/dashboardService.ts` (NEW)
- `backend/src/controllers/dashboardController.ts` (NEW)
- `backend/src/server.ts` (UPDATED - added route)

### Documentation
- `docs/dashboard-summary-implementation.md` (NEW)

## Notes

- **Read-only endpoint**: No audit logs required (as per requirements)
- **Fast queries**: Uses aggregation and indexes
- **Minimal payload**: Only necessary fields included
- **RBAC-safe**: Finance details only visible to ADMIN/FINANCE
- **Stable structure**: Response structure is consistent regardless of data presence

