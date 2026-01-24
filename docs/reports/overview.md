# Reports Module Documentation

## Overview

The Reports module provides operational reporting for occupancy statistics and invoice history. Reports are designed for correctness, traceability, and performance.

## Report Definitions

### 1. Monthly Occupancy Report

**Purpose**: Provides occupancy metrics for a specific month.

**Inputs**:
- `month` (1-12): Month number
- `year`: Year (e.g., 2025)

**Outputs**:
- **Rooms Available**: Count of active rooms (excluding currently OUT_OF_SERVICE)
- **Room Nights Sold**: Sum of nights reserved/occupied in that month
- **Guest Nights**: Sum of (guest_count × nights) for all bookings
- **Occupancy Rate %**: (Room Nights Sold / Room Nights Available) × 100
- **Arrivals**: Count of check-ins in the month
- **Departures**: Count of check-outs in the month

**Optional Breakdown**:
- Metrics grouped by room type (Single, Double, Apartment)

**Assumptions**:
- **Rooms Available**: Uses current room count excluding OUT_OF_SERVICE rooms. This is a simplification - in production, track room availability by day for historical accuracy.
- **Room Nights Calculation**: For bookings spanning month boundaries, only nights within the selected month are counted.
- **Days in Month**: Uses actual days in the month (28-31).

**CSV Export Schema**:
```csv
Metric,Value
Rooms Available,<number>
Room Nights Sold,<number>
Guest Nights,<number>
Occupancy Rate %,<decimal>
Arrivals,<number>
Departures,<number>
```

### 2. Yearly Occupancy Report

**Purpose**: Provides monthly occupancy metrics aggregated for a full year.

**Inputs**:
- `year`: Year (e.g., 2025)

**Outputs**:
- 12 rows (one per month) with same metrics as monthly report
- Annual totals row

**Metrics per Month**:
- Month name
- Rooms Available
- Room Nights Sold
- Guest Nights
- Occupancy Rate %
- Arrivals
- Departures

**Annual Totals**:
- Sum of all monthly metrics
- Annual occupancy rate calculated as: (Total Room Nights Sold / (Rooms Available × 365)) × 100

**Assumptions**:
- Uses same room availability assumption as monthly report
- Annual calculation assumes 365 days (simplified)

**CSV Export Schema**:
```csv
Month,Rooms Available,Room Nights Sold,Guest Nights,Occupancy Rate %,Arrivals,Departures
January,<number>,<number>,<number>,<decimal>,<number>,<number>
...
TOTAL,<number>,<number>,<number>,<decimal>,<number>,<number>
```

### 3. Invoice History Report

**Purpose**: Provides filterable invoice history with payment and export status.

**Inputs (Filters)**:
- `from`: Start date (optional)
- `to`: End date (optional)
- `status`: Invoice status filter (DRAFT/SENT/PAID/VOID) (optional)
- `q`: Search query (invoice ID, customer name) (optional)
- `exportStatus`: Visma export status filter (optional)
- `page`: Page number (default: 1)
- `pageSize`: Results per page (default: 50)

**Outputs**:
- **Invoice #**: Invoice identifier
- **Customer**: Customer name
- **Status**: Invoice status (DRAFT/SENT/PAID/VOID)
- **Total**: Total amount including VAT
- **Payment Status**: Payment status (Paid/Pending/None)
- **Export Status**: Visma export status (PENDING/SENT/FAILED/CONFIRMED or null)
- **Created Date**: Invoice creation date
- **Due Date**: Invoice due date (optional)

**Aggregates**:
- Total invoice count
- Sum of all invoice totals
- Sum of outstanding (unpaid) invoices

**Pagination**:
- Default page size: 50
- Supports pagination controls

**CSV Export Schema**:
```csv
Invoice #,Customer,Status,Total,Payment Status,Export Status,Created Date,Due Date
INV-XXX,<name>,<status>,<currency> <amount>,<status>,<status>,-,<date>
```

## Backend Endpoints

### Occupancy Reports

**GET /reports/occupancy/monthly**
- Parameters: `month` (1-12), `year`
- Returns: JSON with totals and optional byRoomType breakdown

**GET /reports/occupancy/yearly**
- Parameters: `year`
- Returns: JSON with 12 monthly rows + yearTotals

### Invoice History

**GET /reports/invoices/history**
- Parameters: `from`, `to`, `status`, `q`, `exportStatus`, `page`, `pageSize`
- Returns: JSON with paginated invoices + aggregates

### CSV Exports

**GET /reports/occupancy/monthly.csv**
- Same parameters as monthly JSON endpoint
- Returns: CSV file download

**GET /reports/occupancy/yearly.csv**
- Same parameters as yearly JSON endpoint
- Returns: CSV file download

**GET /reports/invoices/history.csv**
- Same parameters as invoice history JSON endpoint
- Returns: CSV file download

## Performance Considerations

- **Aggregation**: All calculations performed server-side using efficient aggregation
- **Indexes**: Ensure indexes on:
  - `bookings(startDate, endDate, status)`
  - `invoices(createdAt, status)`
  - `payments(invoiceId, status)`
  - `accountingExports(invoiceId, status)`
- **Pagination**: Invoice history uses pagination to limit memory usage
- **Caching**: Consider caching monthly/yearly reports for historical months

## Data Quality Assumptions

### Room Availability

**Current Implementation**:
- Uses total active rooms count (excluding currently OUT_OF_SERVICE)
- Does not track historical room availability by day

**Impact**:
- Historical reports may show incorrect "rooms available" if rooms were out of service in the past
- For accurate historical reporting, implement day-by-day room availability tracking

**Recommendation**:
- For production: Track room status changes with timestamps
- Calculate rooms available per day: `total_rooms - out_of_service_on_date`

### Room Nights Calculation

**Current Implementation**:
- Calculates nights within month boundaries for bookings spanning multiple months
- Uses `Math.ceil()` for night calculation (minimum 1 night)

**Example**:
- Booking: Jan 30 - Feb 2
- January report: 2 nights (Jan 30-31)
- February report: 2 nights (Feb 1-2)

### Guest Nights

**Current Implementation**:
- `guest_nights = nights × guest_count` for each booking
- Summed across all bookings in period

## RBAC Rules

### Occupancy Reports
- **ADMIN**: Full access
- **FINANCE**: Full access
- **BOOKING_STAFF**: Full access
- **Others**: No access

### Invoice History
- **ADMIN**: Full access
- **FINANCE**: Full access
- **Others**: No access

## Audit & Traceability

- Report generation does not create audit logs (read-only operation)
- Any "retry export" actions from invoice report are audited (handled in Billing module)

## Testing

### Unit Tests Required

1. **Monthly Occupancy Aggregation**:
   - Test with sample bookings spanning month boundaries
   - Verify nights counted correctly per month
   - Verify guest nights calculation

2. **Yearly Aggregation**:
   - Verify yearly totals = sum of monthly totals
   - Verify annual occupancy rate calculation

3. **Invoice History Filters**:
   - Test date range filtering
   - Test status filtering
   - Test search query
   - Test pagination

### Integration Tests

1. **Month Boundary Test**:
   - Create reservation spanning month boundary
   - Verify nights counted correctly in both months

2. **Performance Test**:
   - Test with large dataset (1000+ bookings)
   - Verify report generation time < 2 seconds

## Known Limitations

1. **Room Availability**: Historical accuracy limited by current implementation (does not track day-by-day availability)
2. **Annual Calculation**: Uses simplified 365-day assumption
3. **Guest Count**: Uses booking guest count (may not reflect actual check-in count)

## Future Enhancements

1. Implement day-by-day room availability tracking
2. Add revenue metrics to occupancy reports
3. Add comparison to previous period
4. Add export to PDF format
5. Add scheduled report generation

