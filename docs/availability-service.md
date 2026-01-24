# AvailabilityService Documentation

## Overview

The `AvailabilityService` provides a single source of truth for room availability checking, overlap detection, and occupancy state calculation. It centralizes all availability logic to ensure consistency across the application.

## Architecture

### Components

1. **AvailabilityService** (`services/availabilityService.ts`)
   - Centralized availability engine
   - Overlap detection algorithm
   - Occupancy state calculation
   - Bookable room filtering

2. **Database Indexes** (`migrations/002_add_availability_indexes.sql`)
   - Optimized indexes for date-range queries
   - Supports efficient availability checks

3. **Integration with StoreService**
   - StoreService delegates to AvailabilityService
   - Maintains backward compatibility

## Core Methods

### `checkOverlap(roomId, start, end, bookings, excludeBookingId?)`

Checks if a date range overlaps with existing bookings for a room.

**Parameters:**
- `roomId`: Room identifier
- `start`: Start date (Date or string)
- `end`: End date (Date or string)
- `bookings`: Array of bookings to check against
- `excludeBookingId`: Optional booking ID to exclude from check (useful for updates)

**Returns:** `boolean` - true if overlap exists

**Algorithm:**
- Normalizes dates to start of day
- Checks: `newStart < bookingEnd && newEnd > bookingStart`
- Excludes cancelled and checked-out bookings
- Allows same-day checkout/checkin (adjacent dates)

**Example:**
```typescript
const hasOverlap = availabilityService.checkOverlap(
  'room-1',
  '2025-01-12',
  '2025-01-18',
  bookings
);
```

### `getRoomOccupancyState(roomId, dateRange, room, bookings)`

Determines the occupancy state of a room for a specific date or date range.

**Parameters:**
- `roomId`: Room identifier
- `dateRange`: Date, date string, or DateRange object
- `room`: Room object
- `bookings`: Array of bookings

**Returns:** `OccupancyState` object:
```typescript
{
  state: RoomOccupancy; // FREE, RESERVED, OCCUPIED, DEPARTING
  currentBooking?: IBooking;
  nextBooking?: IBooking;
  conflictingBookings?: IBooking[];
}
```

**State Logic:**
- **FREE**: No active bookings
- **RESERVED**: Confirmed/Draft booking, not yet checked in
- **OCCUPIED**: Checked-in booking
- **DEPARTING**: Checked-in booking on checkout date

**Example:**
```typescript
const state = availabilityService.getRoomOccupancyState(
  'room-1',
  new Date('2025-01-12'),
  room,
  bookings
);
console.log(state.state); // OCCUPIED
console.log(state.currentBooking?.id); // 'b1'
```

### `isBookable(roomId, start, end, room, bookings, excludeBookingId?)`

Checks if a room can be booked for a given date range.

**Returns false if:**
- Room is OUT_OF_SERVICE
- Date range overlaps with existing active bookings
- Start date >= end date

**Example:**
```typescript
const canBook = availabilityService.isBookable(
  'room-1',
  '2025-01-15',
  '2025-01-20',
  room,
  bookings
);
```

### `getAvailableRooms(start, end, rooms, bookings)`

Returns all rooms that are available for a date range.

**Example:**
```typescript
const available = availabilityService.getAvailableRooms(
  '2025-01-15',
  '2025-01-20',
  allRooms,
  allBookings
);
```

## Database Indexes

The following indexes optimize availability queries:

### `idx_bookings_room_dates`
```sql
CREATE INDEX idx_bookings_room_dates ON bookings(room_id, start_date, end_date) 
WHERE status NOT IN ('CANCELLED', 'CHECKED_OUT');
```
**Use case:** Room-specific date range queries

### `idx_bookings_date_range`
```sql
CREATE INDEX idx_bookings_date_range ON bookings(start_date, end_date, room_id)
WHERE status NOT IN ('CANCELLED', 'CHECKED_OUT');
```
**Use case:** Date range overlap detection

### `idx_rooms_status`
```sql
CREATE INDEX idx_rooms_status ON rooms(status) 
WHERE status = 'OUT_OF_SERVICE';
```
**Use case:** Fast OOS filtering

### `idx_bookings_active_by_room`
```sql
CREATE INDEX idx_bookings_active_by_room ON bookings(room_id, status, start_date, end_date)
WHERE status IN ('CONFIRMED', 'CHECKED_IN', 'DRAFT');
```
**Use case:** Active booking lookups

## Integration Points

### Booking Flow

**Before:**
```typescript
const availableRooms = rooms.filter(room => 
  store.isRoomAvailable(room.id, startDate, endDate)
);
```

**After:**
```typescript
const availableRooms = store.getAvailableRooms(startDate, endDate);
// Or filter by type:
const filtered = availableRooms.filter(r => r.type === RoomType.SINGLE);
```

### Rooms List Summary

**Before:**
```typescript
const summaries = store.getRoomSummaries();
// Used internal logic
```

**After:**
```typescript
const summaries = store.getRoomSummaries();
// Now uses AvailabilityService.getRoomOccupancyState internally
```

## Edge Cases Handled

1. **Adjacent Dates**: Checkout day = checkin day is allowed (no overlap)
2. **Cancelled Bookings**: Excluded from availability checks
3. **Checked-Out Bookings**: Excluded from availability checks
4. **OUT_OF_SERVICE**: Always blocks booking regardless of dates
5. **Date Normalization**: All dates normalized to start of day for consistent comparison

## Performance Considerations

### Frontend (Current)
- In-memory filtering (fast for small datasets)
- No database queries needed

### Backend (Future)
- Use indexes for efficient queries
- Consider caching for frequently accessed date ranges
- Batch availability checks for multiple rooms

## Testing

See `services/__tests__/availabilityService.test.ts` for comprehensive test coverage:

- Overlap detection (various scenarios)
- OOS blocking
- Occupancy state calculation
- Available room filtering

## Migration

To apply the database indexes:

```bash
psql -U your_user -d your_database -f migrations/002_add_availability_indexes.sql
```

Or using a migration tool:
```bash
npm run migrate up
```

