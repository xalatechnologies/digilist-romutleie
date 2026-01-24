# Backend Audit Log Implementation Summary

## Backend Tech Snapshot

**Status**: ✅ Backend created from scratch

**Framework**: Express.js (minimal, standard Node.js framework)
- TypeScript for type safety
- PostgreSQL database (via `pg` client)
- No ORM (direct SQL queries for simplicity)

**Database**: PostgreSQL
- Migration files in `../migrations/001_create_audit_log_table.sql`
- Direct SQL queries via `pg` client
- Connection pooling for performance

**Authentication**: Stub implementation
- JWT-ready structure (stub for demo)
- Test headers: `x-user-id`, `x-user-roles`
- Production-ready JWT verification can be added

**Request Context**: Express middleware
- Captures `x-request-id` header or generates UUID
- Extracts `userId` and `roles` from auth
- Captures `ip` and `userAgent` from request
- Defaults `orgId` to `default-org`

## Files Changed

### Backend Structure Created

```
backend/
├── src/
│   ├── server.ts                    # Express app entrypoint
│   ├── middleware/
│   │   ├── requestContext.ts        # Request context middleware
│   │   └── auth.ts                  # Auth middleware (stub)
│   ├── services/
│   │   └── auditService.ts          # Backend audit service
│   ├── controllers/
│   │   ├── auditController.ts       # Audit query endpoints
│   │   └── roomController.ts       # Room endpoints (demo)
│   ├── models/
│   │   └── auditLog.ts              # AuditLog TypeScript interfaces
│   └── db/
│       ├── connection.ts            # PostgreSQL connection pool
│       └── queries.ts                # SQL queries for audit logs
├── package.json                      # Backend dependencies
├── tsconfig.json                     # TypeScript config
├── .env.example                      # Environment variables template
├── README.md                         # Backend setup guide
├── TESTING.md                        # Manual test steps
└── TECH_SNAPSHOT.md                  # Tech stack documentation
```

### Root Directory

- `migrations/001_create_audit_log_table.sql` - Already exists (no changes needed)

## Migration Info

**Migration File**: `migrations/001_create_audit_log_table.sql`

**Applied Manually**:
```bash
psql -U postgres -d digilist -f migrations/001_create_audit_log_table.sql
```

**Schema**:
- Table: `audit_logs`
- Indexes:
  - `(org_id, created_at DESC)`
  - `(entity_type, entity_id, created_at DESC)`
  - `(actor_user_id, created_at DESC)`
  - `(action, created_at DESC)`

## Endpoint List

### Health Check
- `GET /health` - Server health status

### Audit Logs
- `GET /audit` - Query audit logs
  - Query params:
    - `entityType` - Filter by entity type
    - `entityId` - Filter by entity ID
    - `actorUserId` - Filter by actor user ID
    - `action` - Filter by action
    - `from` - Start date (ISO string)
    - `to` - End date (ISO string)
    - `q` - Search in message
    - `limit` - Results per page (default: 50)
    - `offset` - Pagination offset (default: 0)
  - Returns: `{ logs: AuditLog[], total: number, limit: number, offset: number }`

### Rooms (Demo)
- `PATCH /rooms/:id/status` - Update room status (demonstrates audit logging)
  - Headers:
    - `x-request-id` (optional) - Request ID for tracing
    - `x-user-id` (for testing) - User ID
    - `x-user-roles` (for testing) - Comma-separated roles
  - Body: `{ status: 'CLEAN' | 'DIRTY' | 'OUT_OF_SERVICE', reason?: string }`
  - Returns: `{ success: true, roomId: string, status: string, message: string }`

## Manual Test Steps

### 1. Setup

```bash
# Install dependencies
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with database credentials

# Apply migration
psql -U postgres -d digilist -f ../migrations/001_create_audit_log_table.sql

# Start server
npm run dev
```

### 2. Test Audit Log Creation

```bash
# Create audit log with request ID
curl -X PATCH http://localhost:3001/rooms/room-1/status \
  -H "Content-Type: application/json" \
  -H "x-request-id: REQ-TEST-001" \
  -H "x-user-id: admin" \
  -H "x-user-roles: ADMIN,BOOKING_STAFF" \
  -d '{"status": "OUT_OF_SERVICE", "reason": "Plumbing maintenance"}'
```

### 3. Verify Request ID in Database

```sql
SELECT 
  id, 
  actor_user_id, 
  action, 
  message, 
  metadata->>'requestId' as request_id
FROM audit_logs
WHERE entity_id = 'room-1'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected**: `request_id = 'REQ-TEST-001'`

### 4. Query Audit Logs

```bash
# Query by entity
curl "http://localhost:3001/audit?entityType=ROOM&entityId=room-1&limit=5"

# Query by request ID (search)
curl "http://localhost:3001/audit?q=REQ-TEST-001"
```

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

## Validation Evidence

### ✅ Request ID Handling
- Client sends `x-request-id: REQ-TEST-001`
- Backend stores in `metadata.requestId`
- Verified in database query

### ✅ Auto-generated Request ID
- When `x-request-id` missing, UUID is generated
- Stored in `metadata.requestId`

### ✅ Actor Information
- `actorUserId` from `x-user-id` header (or JWT in production)
- `actorRoles` from `x-user-roles` header (or JWT in production)
- Stored in `actor_user_id` and `actor_roles` columns

### ✅ Audit Log Written After Success
- Audit log only written after successful state change
- No fake logs for failed operations

### ✅ Query Endpoint
- Paginated results
- Filters work correctly
- Returns proper structure

## Next Steps

1. **Add JWT Authentication**: Replace stub auth with real JWT verification
2. **Add More Endpoints**: Integrate audit logging into other operations
3. **Add RBAC**: Protect endpoints based on roles
4. **Add Tests**: Unit and integration tests
5. **Add Logging**: Structured logging for production

