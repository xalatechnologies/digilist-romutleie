# Frontend-Backend Integration Summary

## Overview

Successfully integrated the React frontend with the backend Audit API. The frontend now:
- Calls backend API for room status updates
- Fetches audit logs from backend
- Automatically includes `x-request-id` header for correlation
- Gracefully degrades if backend is unavailable

## Files Changed

### Frontend

1. **`utils/apiClient.ts`** (NEW)
   - API client utility with automatic request context headers
   - Handles `x-request-id`, `x-user-id`, `x-user-roles` headers
   - Base URL from `VITE_API_BASE_URL` environment variable

2. **`services/auditApiService.ts`** (NEW)
   - Service for fetching audit logs from backend
   - `fetchAuditLogs()` - Query audit logs with filters
   - `fetchEntityAuditLogs()` - Get logs for specific entity

3. **`services/storeService.ts`** (UPDATED)
   - `updateRoomStatus()` - Now async, calls backend API first
   - `getAuditLogs()` - Now async, fetches from backend with fallback

4. **`components/Views.tsx`** (UPDATED)
   - `AuditLogList` - Now fetches from backend API
   - `AuditLogView` - Updated to use async `getAuditLogs()`
   - Room status update handlers - Updated to handle async calls

5. **`.env.example`** (NEW)
   - Environment variable template for `VITE_API_BASE_URL`

### Backend

1. **`backend/src/server.ts`** (UPDATED)
   - CORS configuration updated to allow frontend origin
   - Headers: `x-request-id`, `x-user-id`, `x-user-roles` allowed

2. **`backend/src/controllers/roomController.ts`** (UPDATED)
   - Accepts `note` field in request body
   - Improved before/after state tracking

## How to Run Frontend + Backend Locally

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Apply database migration
psql -U postgres -d digilist -f ../migrations/001_create_audit_log_table.sql

# Start backend server
npm run dev
```

Backend will run on `http://localhost:3001`

### 2. Frontend Setup

```bash
# In project root
# Configure environment
cp .env.example .env.local
# Edit .env.local if needed (default: http://localhost:3001)

# Start frontend
npm run dev
```

Frontend will run on `http://localhost:3000`

## Manual Test Steps

### Test 1: Change Room Status (End-to-End)

1. **Open app**: Navigate to `http://localhost:3000`
2. **Go to Rooms**: Click "Rooms" in sidebar
3. **Select a room**: Click on any room card
4. **Change status**: 
   - Click "Mark Dirty" or "Mark Clean"
   - Or set room "Out of Service" with a reason
5. **Verify backend**: Check backend console for:
   - Request received with `x-request-id` header
   - Audit log written to database
6. **Verify frontend**: 
   - Room status updates in UI
   - Activity Log section shows new audit entry
   - Entry includes timestamp, actor, and message

### Test 2: Verify Request ID Correlation

1. **Open browser DevTools**: Network tab
2. **Change room status**: Follow Test 1 steps
3. **Check request headers**: 
   - Look for `x-request-id` header in PATCH request
   - Note the request ID value
4. **Query audit logs**: 
   - Open room drawer
   - Check Activity Log section
   - Verify audit entry has matching request ID in metadata

### Test 3: Verify Database Storage

1. **Change room status**: Follow Test 1 steps
2. **Query database**:
   ```sql
   SELECT 
     id, 
     actor_user_id, 
     action, 
     entity_type, 
     entity_id, 
     message, 
     metadata->>'requestId' as request_id,
     created_at
   FROM audit_logs
   WHERE entity_type = 'ROOM'
   ORDER BY created_at DESC
   LIMIT 5;
   ```
3. **Verify**:
   - `request_id` matches the `x-request-id` header sent
   - `actor_user_id` matches the user
   - `action` is `ROOM_CONDITION_CHANGED` or `ROOM_SET_OUT_OF_SERVICE`
   - `message` is human-readable

### Test 4: Backend Unavailable (Graceful Degradation)

1. **Stop backend**: `Ctrl+C` in backend terminal
2. **Change room status**: Follow Test 1 steps
3. **Verify**: 
   - Frontend still works (local state update)
   - Console shows warning: "Backend API unavailable"
   - Local audit log created as fallback

## Example Request Flow

### Request Headers
```
PATCH /rooms/room-1/status
Headers:
  Content-Type: application/json
  x-request-id: REQ-1704067200000-ABC123
  x-user-id: admin
  x-user-roles: ADMIN,BOOKING_STAFF
Body:
  {
    "status": "OUT_OF_SERVICE",
    "reason": "Plumbing maintenance",
    "note": "Leak in bathroom"
  }
```

### Backend Response
```json
{
  "success": true,
  "roomId": "room-1",
  "status": "OUT_OF_SERVICE",
  "message": "Room status updated and audit logged"
}
```

### Database Audit Log Entry
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
    "reason": null,
    "note": null
  },
  "after": {
    "status": "OUT_OF_SERVICE",
    "reason": "Plumbing maintenance",
    "note": "Leak in bathroom"
  },
  "metadata": {
    "requestId": "REQ-1704067200000-ABC123",
    "orgId": "default-org",
    "userAgent": "Mozilla/5.0...",
    "ip": "::1"
  },
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

## Verification Checklist

- [x] Frontend sends `x-request-id` header automatically
- [x] Backend stores `requestId` in audit log metadata
- [x] Room status changes call backend API
- [x] Audit logs fetched from backend in UI
- [x] Room drawer shows backend audit entries
- [x] Graceful degradation when backend unavailable
- [x] CORS configured correctly
- [x] No breaking changes to existing functionality

## Next Steps

1. **Add more endpoints**: Extend backend for other operations (bookings, invoices, etc.)
2. **Add authentication**: Implement JWT authentication
3. **Add error handling**: Better error messages and retry logic
4. **Add loading states**: Show loading indicators during API calls
5. **Add offline support**: Queue requests when backend unavailable

