# Dashboard UI Integration

## Overview

This document describes how the Dashboard UI is wired to the backend `/dashboard/summary` endpoint with RBAC-aware rendering.

## Implementation

### 1. Dashboard API Service

**File:** `services/dashboardApiService.ts`

- Provides typed interface matching backend response
- `getDashboardSummary(date?: string)` - Fetches dashboard data from backend
- Automatically includes request context headers via `apiClient`

### 2. Dashboard Component Updates

**File:** `components/Dashboard.tsx`

**Key Changes:**
- Replaced local `store` data with backend API calls
- Added loading state (spinner with "Loading dashboard...")
- Added error state (error banner with retry button)
- Auto-refresh every 30 seconds
- RBAC-aware rendering: Only shows sections that exist in backend response

**Data Flow:**
1. Component mounts → `fetchSummary()` called
2. Backend returns data filtered by user role
3. Component renders only sections present in response:
   - `summary.kitchen` exists → Show kitchen section
   - `summary.billing` exists → Show billing section
   - Missing blocks → Sections hidden automatically

## RBAC Visibility Rules

### ADMIN
- **Shows:** All sections (rooms, occupancy, arrivals, departures, housekeeping, kitchen, billing)

### BOOKING_STAFF
- **Shows:** rooms, occupancy, arrivals, departures, housekeeping, kitchen
- **Hides:** billing (not in response)

### FINANCE
- **Shows:** rooms, occupancy, arrivals, departures, housekeeping, billing
- **Hides:** kitchen (not in response)

### HOUSEKEEPING
- **Shows:** rooms, housekeeping, arrivals, departures
- **Hides:** kitchen, billing

### KITCHEN
- **Shows:** kitchen, arrivals, departures
- **Hides:** rooms details, billing

## Sections Rendered

### 1. KPI Cards (Top Row)
- Occupancy rate (calculated from backend data)
- Arrivals count
- Departures count
- Dirty units count
- Out of service count
- Open balance (only if `summary.billing` exists)

### 2. Priority Alerts
- Built from arrivals + billing alerts (if billing exists)
- Shows urgent items requiring attention

### 3. Arrivals Today
- Table of arrivals from `summary.arrivals.items`
- Shows: customer name (or "Guest"), room number, start time, status
- Empty state if no arrivals

### 4. Departures Today
- Table of departures from `summary.departures.items`
- Shows: room number, end time, status
- Empty state if no departures

### 5. Active Task Queue
- Housekeeping tasks (from `summary.housekeeping.items`)
- Kitchen orders (from `summary.kitchen.items`, only if kitchen block exists)
- Shows: task/order details, due time, status

### 6. Kitchen Orders Section (Conditional)
- **Only shown if:** `summary.kitchen` exists
- Lists next 24h orders
- Shows: item name, quantity, location, order time, status

### 7. Billing Alerts Section (Conditional)
- **Only shown if:** `summary.billing` exists AND has alerts
- Shows: Failed Visma exports, Pending exports
- Empty state if no alerts

## Loading & Error States

### Loading State
- Shows spinner with "Loading dashboard..." message
- Displayed while `loading === true && summary === null`

### Error State
- Shows error banner with:
  - Error icon
  - Error message
  - Retry button
- Displayed when `error !== null && summary === null`

### Auto-Refresh
- Refreshes every 30 seconds
- Uses `setInterval` in `useEffect`

## Manual Verification

### Test as ADMIN

```bash
# Set role header
x-user-roles: ADMIN

# Expected sections:
✅ KPI cards (all 6)
✅ Priority alerts
✅ Arrivals today
✅ Departures today
✅ Active task queue
✅ Kitchen orders (if orders exist)
✅ Billing alerts (if alerts exist)
```

### Test as BOOKING_STAFF

```bash
# Set role header
x-user-roles: BOOKING_STAFF

# Expected sections:
✅ KPI cards (5 cards, no billing)
✅ Priority alerts (no billing alerts)
✅ Arrivals today
✅ Departures today
✅ Active task queue (housekeeping + kitchen)
✅ Kitchen orders
❌ Billing alerts (hidden - not in response)
```

### Test as FINANCE

```bash
# Set role header
x-user-roles: FINANCE

# Expected sections:
✅ KPI cards (6 cards, includes billing)
✅ Priority alerts (includes billing alerts)
✅ Arrivals today
✅ Departures today
✅ Active task queue (housekeeping only)
✅ Billing alerts
❌ Kitchen orders (hidden - not in response)
```

## Files Changed

### Frontend
- `services/dashboardApiService.ts` (NEW)
- `components/Dashboard.tsx` (UPDATED)

### Documentation
- `docs/dashboard-ui-integration.md` (NEW)

## Notes

- **No UI redesign**: Existing component structure preserved
- **RBAC-safe**: Frontend only renders what backend provides
- **No role guessing**: Frontend doesn't check user roles, only checks response structure
- **Graceful degradation**: Missing sections simply don't render (no errors)
- **Auto-refresh**: Data updates every 30 seconds automatically

