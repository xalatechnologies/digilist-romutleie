# Backend Testing Guide

## Manual Test Steps

### Prerequisites

1. Start PostgreSQL database
2. Apply migration:
   ```bash
   psql -U postgres -d digilist -f ../migrations/001_create_audit_log_table.sql
   ```
3. Start backend server:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

### Test 1: Create Audit Log with Request ID

**Request**:
```bash
curl -X PATCH http://localhost:3001/rooms/room-1/status \
  -H "Content-Type: application/json" \
  -H "x-request-id: REQ-TEST-001" \
  -H "x-user-id: admin" \
  -H "x-user-roles: ADMIN,BOOKING_STAFF" \
  -d '{
    "status": "OUT_OF_SERVICE",
    "reason": "Plumbing maintenance"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "roomId": "room-1",
  "status": "OUT_OF_SERVICE",
  "message": "Room status updated and audit logged"
}
```

**Verify in Database**:
```sql
SELECT 
  id, 
  org_id, 
  actor_user_id, 
  actor_roles, 
  action, 
  entity_type, 
  entity_id, 
  message, 
  metadata->>'requestId' as request_id,
  created_at
FROM audit_logs
WHERE entity_id = 'room-1'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result**:
- `org_id`: `default-org`
- `actor_user_id`: `admin`
- `actor_roles`: `["ADMIN", "BOOKING_STAFF"]`
- `action`: `ROOM_SET_OUT_OF_SERVICE`
- `entity_type`: `ROOM`
- `entity_id`: `room-1`
- `message`: Contains "Room set out of service"
- `metadata->>'requestId'`: `REQ-TEST-001`

### Test 2: Query Audit Logs

**Request**:
```bash
curl "http://localhost:3001/audit?entityType=ROOM&entityId=room-1&limit=5"
```

**Expected Response**:
```json
{
  "logs": [
    {
      "id": "...",
      "orgId": "default-org",
      "actorUserId": "admin",
      "actorRoles": ["ADMIN", "BOOKING_STAFF"],
      "action": "ROOM_SET_OUT_OF_SERVICE",
      "entityType": "ROOM",
      "entityId": "room-1",
      "message": "Room set out of service (Reason: Plumbing maintenance)",
      "before": { "status": "CLEAN", "reason": null },
      "after": { "status": "OUT_OF_SERVICE", "reason": "Plumbing maintenance" },
      "metadata": {
        "requestId": "REQ-TEST-001",
        "orgId": "default-org",
        "userAgent": "...",
        "ip": "..."
      },
      "createdAt": "2025-01-XX..."
    }
  ],
  "total": 1,
  "limit": 5,
  "offset": 0
}
```

### Test 3: Verify Request ID in Metadata

**Request**:
```bash
curl "http://localhost:3001/audit?q=REQ-TEST-001"
```

**Expected**: Returns the audit log with `metadata.requestId = "REQ-TEST-001"`

### Test 4: Test Without Request ID (Auto-generated)

**Request**:
```bash
curl -X PATCH http://localhost:3001/rooms/room-2/status \
  -H "Content-Type: application/json" \
  -H "x-user-id: staff" \
  -d '{"status": "DIRTY"}'
```

**Verify**: Check database - `metadata->>'requestId'` should be a UUID (auto-generated)

### Test 5: Test System Job (No User)

**Request**:
```bash
curl -X PATCH http://localhost:3001/rooms/room-3/status \
  -H "Content-Type: application/json" \
  -d '{"status": "CLEAN"}'
```

**Verify**: 
- `actor_user_id`: `null`
- `actor_roles`: `[]` or `["SYSTEM"]` (depending on implementation)

## Validation Checklist

- [x] Request ID from `x-request-id` header is stored in `metadata.requestId`
- [x] Auto-generated UUID is created when `x-request-id` is missing
- [x] `actorUserId` is captured from `x-user-id` header (or JWT in production)
- [x] `actorRoles` is captured from `x-user-roles` header (or JWT in production)
- [x] `orgId` defaults to `default-org`
- [x] `ip` and `userAgent` are captured from request
- [x] Audit log is written to database after successful state change
- [x] Query endpoint returns paginated results
- [x] Filters work correctly (entityType, entityId, action, etc.)

## Sample Audit Log Row

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "orgId": "default-org",
  "actorUserId": "admin",
  "actorRoles": ["ADMIN", "BOOKING_STAFF"],
  "action": "ROOM_SET_OUT_OF_SERVICE",
  "entityType": "ROOM",
  "entityId": "room-1",
  "message": "Room set out of service (Reason: Plumbing maintenance)",
  "before": {
    "status": "CLEAN",
    "reason": null
  },
  "after": {
    "status": "OUT_OF_SERVICE",
    "reason": "Plumbing maintenance"
  },
  "metadata": {
    "requestId": "REQ-TEST-001",
    "orgId": "default-org",
    "userAgent": "curl/7.68.0",
    "ip": "::1"
  },
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

