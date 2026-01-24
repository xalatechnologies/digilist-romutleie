# Reports Module

## Overview

This document describes the Reports module endpoints for occupancy statistics and invoice history, including CSV export capabilities.

## Definitions

### Room Nights
- **Room Night**: One room occupied for one night
- **Calculation**: For a reservation, count the number of nights that overlap the reporting period
- **Example**: Reservation from Jan 15 to Jan 18 = 3 room nights

### Guest Nights
- **Guest Night**: One guest staying for one night
- **Calculation**: Room nights × guest_count
- **Example**: 3 room nights × 2 guests = 6 guest nights

### Occupancy Rate
- **Formula**: `(Room Nights Sold / Room Nights Available) × 100`
- **Room Nights Available**: `Rooms Available × Days in Period`
- **Example**: 100 room nights sold / 500 room nights available = 20% occupancy

## Assumptions

### Rooms Available
**Assumption**: Use total rooms minus current OUT_OF_SERVICE count.

- This is a simplification for historical reporting
- In reality, rooms might be OUT_OF_SERVICE for part of the month
- For accurate historical reporting, you would need to track room status changes over time
- Current implementation uses the current state of rooms (excluding OUT_OF_SERVICE)

**Alternative approach (not implemented)**: Use total rooms count regardless of status. This would give higher occupancy rates but is less accurate.

### Reservation Status
Only active reservations are counted:
- **Included**: CONFIRMED, CHECKED_IN, CHECKED_OUT
- **Excluded**: CANCELLED, DRAFT

### Night Calculation
For reservations that overlap month boundaries:
- Count only nights within the reporting period
- Example: Reservation Jan 28 - Feb 3, reporting January:
  - Counts 4 nights (Jan 28, 29, 30, 31)

## Endpoints

### Monthly Occupancy Report

#### `GET /reports/occupancy/monthly?month=&year=`
**Required role:** BOOKING_STAFF, FINANCE, or ADMIN

**Query Parameters:**
- `month` (required): Month number (1-12)
- `year` (required): Year (e.g., 2025)

**Response:**
```json
{
  "month": 1,
  "year": 2025,
  "roomsAvailable": 50,
  "roomNightsSold": 1200,
  "guestNights": 2400,
  "occupancyRate": 77.42,
  "arrivals": 45,
  "departures": 38
}
```

**CSV Export:** `GET /reports/occupancy/monthly.csv?month=&year=`

**Sample CSV:**
```csv
Month,Year,Rooms Available,Room Nights Sold,Guest Nights,Occupancy Rate %,Arrivals,Departures
1,2025,50,1200,2400,77.42,45,38
```

### Yearly Occupancy Report

#### `GET /reports/occupancy/yearly?year=`
**Required role:** BOOKING_STAFF, FINANCE, or ADMIN

**Query Parameters:**
- `year` (required): Year (e.g., 2025)

**Response:**
```json
{
  "year": 2025,
  "months": [
    {
      "month": 1,
      "roomsAvailable": 50,
      "roomNightsSold": 1200,
      "guestNights": 2400,
      "occupancyRate": 77.42,
      "arrivals": 45,
      "departures": 38
    },
    // ... 11 more months
  ],
  "totals": {
    "roomNightsSold": 15000,
    "guestNights": 30000,
    "arrivals": 540,
    "departures": 456,
    "avgOccupancyRate": 82.15
  }
}
```

**CSV Export:** `GET /reports/occupancy/yearly.csv?year=`

**Sample CSV:**
```csv
Month,Year,Rooms Available,Room Nights Sold,Guest Nights,Occupancy Rate %,Arrivals,Departures
1,2025,50,1200,2400,77.42,45,38
2,2025,50,1350,2700,82.14,52,41
...
TOTAL,2025,,15000,30000,82.15,540,456
```

### Invoice History Report

#### `GET /reports/invoices/history?from=&to=&status=&q=&exportStatus=&limit=&offset=`
**Required role:** FINANCE or ADMIN

**Query Parameters:**
- `from` (optional): Start date (YYYY-MM-DD)
- `to` (optional): End date (YYYY-MM-DD)
- `status` (optional): Invoice status (DRAFT, SENT, PAID, VOID)
- `q` (optional): Search term (customer name or invoice ID)
- `exportStatus` (optional): Export status (PENDING, SENT, FAILED, CONFIRMED)
- `limit` (optional): Page size (default: 50)
- `offset` (optional): Page offset (default: 0)

**Response:**
```json
{
  "total": 150,
  "items": [
    {
      "invoiceId": "inv-123",
      "customerName": "John Doe",
      "status": "PAID",
      "total": 2300.00,
      "createdAt": "2025-01-15T10:00:00Z",
      "exportStatus": "SENT",
      "lastError": null
    }
  ],
  "aggregates": {
    "count": 150,
    "sumTotal": 345000.00
  }
}
```

**CSV Export:** `GET /reports/invoices/history.csv?from=&to=&status=&q=&exportStatus=`

**Sample CSV:**
```csv
Invoice ID,Customer Name,Status,Total,Created At,Export Status,Last Error
inv-123,John Doe,PAID,2300.00,2025-01-15T10:00:00Z,SENT,
inv-124,Jane Smith,SENT,1500.00,2025-01-16T14:30:00Z,PENDING,
inv-125,Bob Johnson,DRAFT,800.00,2025-01-17T09:15:00Z,NONE,
```

## RBAC Rules

### Occupancy Reports
- **BOOKING_STAFF**: ✅ Access
- **FINANCE**: ✅ Access
- **ADMIN**: ✅ Access
- **HOUSEKEEPING**: ❌ Denied
- **KITCHEN**: ❌ Denied

### Invoice History Reports
- **FINANCE**: ✅ Access
- **ADMIN**: ✅ Access
- **BOOKING_STAFF**: ❌ Denied
- **HOUSEKEEPING**: ❌ Denied
- **KITCHEN**: ❌ Denied

## CSV Export

All reports support CSV export via `.csv` endpoint suffix or `format=csv` query parameter.

**CSV Features:**
- Header row included
- Proper escaping of commas, quotes, and newlines
- UTF-8 encoding
- Content-Disposition header for file download

**CSV Escaping Rules:**
- Fields containing comma, quote, or newline are wrapped in double quotes
- Double quotes within fields are escaped as `""`
- Null/undefined values are empty strings

## Performance

### Indexes
The following indexes optimize report queries:

1. **`idx_reservations_date_range`**: `(start_date, end_date)` WHERE status IN (...)
   - Optimizes occupancy night calculations

2. **`idx_reservations_start_date`**: `(start_date)` WHERE status IN (...)
   - Optimizes arrivals count

3. **`idx_reservations_end_date`**: `(end_date)` WHERE status IN (...)
   - Optimizes departures count

4. **`idx_invoices_created_status`**: `(created_at, status)`
   - Optimizes invoice history date range and status filtering

5. **`idx_invoices_customer_search`**: `(customer_name)`
   - Optimizes customer name search

### Query Optimization
- Uses SQL aggregation (COUNT, SUM) instead of loading full datasets
- Pagination for invoice history (default 50 items)
- Date range queries use indexed columns

## Manual Testing

### Monthly Occupancy Report

```bash
curl "http://localhost:3001/reports/occupancy/monthly?month=1&year=2025" \
  -H "x-user-id: staff-1" \
  -H "x-user-roles: BOOKING_STAFF"
```

**Expected:** JSON with monthly occupancy metrics

### Yearly Occupancy Report

```bash
curl "http://localhost:3001/reports/occupancy/yearly?year=2025" \
  -H "x-user-id: finance-1" \
  -H "x-user-roles: FINANCE"
```

**Expected:** JSON with 12 months + totals

### Invoice History Report

```bash
curl "http://localhost:3001/reports/invoices/history?from=2025-01-01&to=2025-01-31&status=PAID" \
  -H "x-user-id: finance-1" \
  -H "x-user-roles: FINANCE"
```

**Expected:** Paginated invoice list with aggregates

### CSV Export

```bash
curl "http://localhost:3001/reports/occupancy/monthly.csv?month=1&year=2025" \
  -H "x-user-id: staff-1" \
  -H "x-user-roles: BOOKING_STAFF" \
  -o occupancy-jan-2025.csv
```

**Expected:** CSV file download

## Files Changed

### Backend
- `backend/src/models/reports.ts` (NEW)
- `backend/src/db/reportQueries.ts` (NEW)
- `backend/src/utils/csvBuilder.ts` (NEW)
- `backend/src/controllers/reportController.ts` (NEW)
- `backend/src/server.ts` (UPDATED - added routes)
- `migrations/008_add_report_indexes.sql` (NEW)

### Documentation
- `docs/reports.md` (NEW)
- `migrations/README.md` (UPDATED)

