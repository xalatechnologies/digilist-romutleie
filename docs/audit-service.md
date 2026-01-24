# AuditService Documentation

## Overview

The `AuditService` provides a unified, centralized audit logging system that integrates with the Request Context to automatically track who, what, when, and why for all system operations.

## Architecture

### Components

1. **AuditService** (`services/auditService.ts`)
   - Centralized audit logging service
   - Integrates with RequestContext automatically
   - Provides structured logging methods

2. **AuditLog Table** (`migrations/001_create_audit_log_table.sql`)
   - Database schema with optimized indexes
   - Supports efficient querying by entity, actor, organization, action, and time

3. **Integration with StoreService**
   - StoreService delegates audit logging to AuditService
   - Maintains backward compatibility

## Usage

### Basic Logging

```typescript
import { auditService } from './services/auditService';
import { AuditAction, AuditEntityType } from './types';

// Simple event log
auditService.log({
  action: AuditAction.ROOM_CREATED,
  entityType: AuditEntityType.ROOM,
  entityId: roomId,
  message: `Room ${roomNumber} created`,
  metadata: { roomType: 'SINGLE', floor: 1 }
});
```

### Change Tracking

```typescript
// Track state changes (before/after)
auditService.logChange({
  entityType: AuditEntityType.ROOM,
  entityId: roomId,
  action: AuditAction.ROOM_CONDITION_CHANGED,
  before: { status: 'CLEAN' },
  after: { status: 'DIRTY' },
  message: 'Room marked as dirty after checkout',
  metadata: { bookingId: 'b123' }
});
```

### Querying Logs

```typescript
// Get logs for a specific entity
const roomLogs = auditService.getLogsForEntity(
  AuditEntityType.ROOM,
  roomId,
  50 // limit
);

// Get logs for a specific user
const userLogs = auditService.getLogsForActor('user-123', 100);

// Get logs with filters
const recentLogs = auditService.getLogs({
  entityType: AuditEntityType.INVOICE,
  from: new Date('2025-01-01'),
  to: new Date('2025-01-31'),
  limit: 1000
});
```

## Request Context Integration

The AuditService automatically includes Request Context in all logs:

- **orgId**: From request context
- **actorUserId**: From request context (or explicitly provided)
- **actorRoles**: From request context (or explicitly provided)
- **requestId**: Automatically included in metadata
- **correlationId**: For distributed tracing
- **userAgent**: Browser/client information
- **ip**: Client IP (if available)

## Database Schema

### AuditLog Table

```sql
CREATE TABLE audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  org_id VARCHAR(255) NOT NULL,
  actor_user_id VARCHAR(255),
  actor_roles JSON NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255),
  message TEXT NOT NULL,
  before_state JSON,
  after_state JSON,
  metadata JSON,
  created_at TIMESTAMP NOT NULL
);
```

### Indexes

1. **Entity Index**: `(entity_type, entity_id, created_at DESC)`
   - Fast queries: "Get all logs for room X"

2. **Actor Index**: `(actor_user_id, created_at DESC)`
   - Fast queries: "Get all actions by user X"

3. **Organization Index**: `(org_id, created_at DESC)`
   - Fast queries: "Get all logs for org X"

4. **Action Index**: `(action, created_at DESC)`
   - Fast queries: "Get all ROOM_SET_OUT_OF_SERVICE events"

5. **Time Index**: `(created_at DESC)`
   - Fast queries: "Get recent logs"

## Example Audit Log Entry

When a room status is changed, the following audit log is created:

```json
{
  "id": "AUDIT-1704067200000-ABC123",
  "orgId": "default-org",
  "actorUserId": "admin",
  "actorRoles": ["ADMIN"],
  "action": "ROOM_CONDITION_CHANGED",
  "entityType": "ROOM",
  "entityId": "room-123",
  "message": "Housekeeping status changed: CLEAN -> DIRTY",
  "before": {
    "status": "CLEAN",
    "reason": null,
    "note": null
  },
  "after": {
    "status": "DIRTY",
    "reason": null,
    "note": null
  },
  "metadata": {
    "requestId": "REQ-1704067200000-XYZ789",
    "orgId": "default-org",
    "userAgent": "Mozilla/5.0...",
    "roomNumber": "101",
    "roomType": "SINGLE"
  },
  "createdAt": "2025-01-01T12:00:00.000Z"
}
```

## Integration with StoreService

StoreService methods automatically use AuditService:

```typescript
// Before (manual logging)
store.updateRoomStatus(roomId, RoomStatus.DIRTY, 'admin');
// → Creates audit log via AuditService

// The log includes:
// - Request context (orgId, requestId, userAgent)
// - Before/after state
// - Entity information
// - Metadata
```

## Backend Implementation Notes

When implementing the backend:

1. **Database Connection**: Replace in-memory storage with DB writes
2. **Transactions**: Wrap audit logging in transactions for consistency
3. **Async Logging**: Consider async/queue for high-volume scenarios
4. **Bulk Operations**: Support bulk logging for batch operations
5. **Retention Policy**: Implement log retention/archival strategy

## Testing

```typescript
// Test audit logging
const log = auditService.log({
  action: AuditAction.ROOM_CREATED,
  entityType: AuditEntityType.ROOM,
  entityId: 'test-room-1',
  message: 'Test room created'
});

console.log('Audit log created:', log.id);
console.log('Request ID in metadata:', log.metadata?.requestId);
console.log('Org ID:', log.orgId);
```

## Migration

To apply the database migration:

```bash
# Using psql
psql -U your_user -d your_database -f migrations/001_create_audit_log_table.sql

# Or using a migration tool
npm run migrate up
```

