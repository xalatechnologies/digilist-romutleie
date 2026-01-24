# Backend Tech Snapshot

## Current State

**Status**: Frontend-only React application (Vite + TypeScript)
- No backend server currently exists
- Data stored in-memory via `services/storeService.ts`
- Frontend-only audit logging via `services/auditService.ts` (in-memory)

## Proposed Backend Architecture

### Framework
- **Express.js** (minimal, standard Node.js framework)
- **TypeScript** (already in use)
- **Node.js** runtime

### Database
- **PostgreSQL** (based on existing migration files)
- **pg** (PostgreSQL client) or **Prisma** (ORM - optional)
- Migration tooling: Manual SQL files in `migrations/` directory

### Authentication & RBAC
- **JWT** tokens (standard approach)
- Middleware to extract `userId` and `roles` from JWT
- Default `orgId` for single-tenant (can be extended)

### Request Context
- Express middleware to capture:
  - `x-request-id` header (or generate UUID)
  - `userId` from JWT
  - `roles` from JWT
  - `orgId` (default: "default-org")
  - `ip` from `req.ip`
  - `userAgent` from `req.headers['user-agent']`

### Project Structure
```
backend/
├── src/
│   ├── server.ts          # Express app entrypoint
│   ├── middleware/
│   │   ├── requestContext.ts  # Request context middleware
│   │   └── auth.ts             # JWT auth middleware
│   ├── services/
│   │   ├── auditService.ts     # Backend audit service
│   │   └── roomService.ts       # Room operations (demo)
│   ├── controllers/
│   │   ├── auditController.ts   # Audit query endpoints
│   │   └── roomController.ts    # Room endpoints (demo)
│   ├── models/
│   │   └── auditLog.ts          # AuditLog model/interface
│   └── db/
│       ├── connection.ts        # DB connection
│       └── queries.ts            # SQL queries
├── migrations/
│   └── 001_create_audit_log_table.sql  # (already exists)
└── package.json
```

## Dependencies Required

**Minimal additions**:
- `express` - Web framework
- `@types/express` - TypeScript types
- `pg` - PostgreSQL client (or `@prisma/client` if using Prisma)
- `uuid` - Generate request IDs
- `jsonwebtoken` - JWT handling (if using JWT auth)

**Optional**:
- `dotenv` - Environment variables
- `cors` - CORS middleware
- `helmet` - Security headers

## Implementation Approach

1. Create minimal Express server
2. Use existing SQL migration files
3. Implement RequestContext middleware
4. Implement AuditService with DB writes
5. Add one demo endpoint (room status change)
6. Add audit query endpoint

## Notes

- Backend will run on separate port (e.g., 3001)
- Frontend will call backend APIs instead of `storeService`
- Migration to backend will be gradual (frontend can still use `storeService` for now)

