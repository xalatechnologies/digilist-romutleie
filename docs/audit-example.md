# Example Audit Log Entry

## Test Scenario: Room Status Change

### API Call (simulated)
```typescript
// User: admin (from RequestContext)
// Action: Update room status from CLEAN to DIRTY
store.updateRoomStatus('1', RoomStatus.DIRTY);
```

### Generated Audit Log Entry

```json
{
  "id": "AUDIT-1704067200000-ABC123",
  "orgId": "default-org",
  "actorUserId": "admin",
  "actorRoles": ["ADMIN"],
  "action": "ROOM_CONDITION_CHANGED",
  "entityType": "ROOM",
  "entityId": "1",
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
    "correlationId": null,
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
    "ip": null,
    "roomNumber": "101",
    "roomType": "Single",
    "ticketId": null
  },
  "createdAt": "2025-01-01T12:00:00.000Z",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "userId": "admin",
  "domain": "ROOM",
  "details": "Housekeeping status changed: CLEAN -> DIRTY"
}
```

### Database Row (PostgreSQL)

```sql
INSERT INTO audit_logs (
  id, org_id, actor_user_id, actor_roles, action, 
  entity_type, entity_id, message, before_state, after_state, metadata, created_at
) VALUES (
  'AUDIT-1704067200000-ABC123',
  'default-org',
  'admin',
  '["ADMIN"]'::json,
  'ROOM_CONDITION_CHANGED',
  'ROOM',
  '1',
  'Housekeeping status changed: CLEAN -> DIRTY',
  '{"status": "CLEAN", "reason": null, "note": null}'::json,
  '{"status": "DIRTY", "reason": null, "note": null}'::json,
  '{"requestId": "REQ-1704067200000-XYZ789", "orgId": "default-org", "userAgent": "Mozilla/5.0...", "roomNumber": "101", "roomType": "Single"}'::json,
  '2025-01-01 12:00:00'::timestamp
);
```

### Query Examples

```sql
-- Get all logs for room-1 (uses index: entity_type, entity_id, created_at)
SELECT * FROM audit_logs 
WHERE entity_type = 'ROOM' AND entity_id = '1' 
ORDER BY created_at DESC 
LIMIT 50;

-- Get all actions by admin user (uses index: actor_user_id, created_at)
SELECT * FROM audit_logs 
WHERE actor_user_id = 'admin' 
ORDER BY created_at DESC 
LIMIT 100;

-- Get all ROOM_CONDITION_CHANGED events in last 24 hours (uses index: action, created_at)
SELECT * FROM audit_logs 
WHERE action = 'ROOM_CONDITION_CHANGED' 
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Get all logs for organization (uses index: org_id, created_at)
SELECT * FROM audit_logs 
WHERE org_id = 'default-org' 
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

