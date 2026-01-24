# Backend API Server

Backend API server for Digilist Romutleie booking system.

## Setup

1. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Run database migrations**:
   ```bash
   # Apply migration from root directory
   psql -U postgres -d digilist -f ../migrations/001_create_audit_log_table.sql
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

   Server will run on `http://localhost:3001`

## Endpoints

### Health Check
- `GET /health` - Server health status

### Audit Logs
- `GET /audit` - Query audit logs with filters
  - Query params: `entityType`, `entityId`, `actorUserId`, `action`, `from`, `to`, `q`, `limit`, `offset`

### Rooms (Demo)
- `PATCH /rooms/:id/status` - Update room status (demonstrates audit logging)
  - Body: `{ status: 'CLEAN' | 'DIRTY' | 'OUT_OF_SERVICE', reason?: string }`
  - Headers: `x-request-id` (optional), `x-user-id` (for testing)

## Testing

### Test with curl

**1. Update room status (creates audit log)**:
```bash
curl -X PATCH http://localhost:3001/rooms/room-1/status \
  -H "Content-Type: application/json" \
  -H "x-request-id: REQ-12345" \
  -H "x-user-id: admin" \
  -H "x-user-roles: ADMIN" \
  -d '{"status": "OUT_OF_SERVICE", "reason": "Maintenance"}'
```

**2. Query audit logs**:
```bash
curl "http://localhost:3001/audit?entityType=ROOM&limit=10"
```

**3. Query with request ID filter**:
```bash
curl "http://localhost:3001/audit?q=REQ-12345"
```

## Architecture

- **Express.js** - Web framework
- **PostgreSQL** - Database (via `pg` client)
- **TypeScript** - Type safety
- **Request Context** - Per-request context middleware
- **Audit Service** - Centralized audit logging

## Migration

The backend uses SQL migration files from the root `migrations/` directory.

Apply migrations manually:
```bash
psql -U postgres -d digilist -f ../migrations/001_create_audit_log_table.sql
```

