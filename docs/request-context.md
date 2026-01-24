# Request Context System

## Overview

The Request Context system provides a unified way to track user, organization, and request metadata throughout the application. It ensures that all operations have access to contextual information without needing to pass it explicitly through function parameters.

## Architecture

### Components

1. **RequestContextProvider** - React context provider that wraps the application
2. **useRequestContext** - React hook for accessing context in components
3. **getRequestContext** - Utility function for accessing context in services/utilities
4. **Request Context Helpers** - Utility functions for common operations

## Usage

### In React Components

```typescript
import { useRequestContext } from './contexts/RequestContext';

const MyComponent = () => {
  const { context, setContext } = useRequestContext();
  
  // Access context properties
  const userId = context.userId;
  const requestId = context.requestId;
  const orgId = context.orgId;
  
  // Update context
  setContext({ userId: 'new-user-id' });
  
  return <div>User: {userId}, Request: {requestId}</div>;
};
```

### In Services (Non-React)

```typescript
import { getRequestContext } from '../contexts/RequestContext';

class MyService {
  doSomething() {
    const ctx = getRequestContext();
    const userId = ctx.userId;
    const requestId = ctx.requestId;
    
    // Use context in operations
    console.log(`Operation by ${userId} (request: ${requestId})`);
  }
}
```

### Using Helpers

```typescript
import { getCurrentRequestId, getCurrentUserId, hasRole } from '../utils/requestContextHelper';

const requestId = getCurrentRequestId();
const userId = getCurrentUserId();
const isAdmin = hasRole('ADMIN');
```

## Context Properties

- **orgId**: Organization/Tenant ID (default: 'default-org')
- **userId**: Current user ID (default: 'system')
- **roles**: Array of user roles
- **requestId**: Unique request ID (auto-generated)
- **ip**: Client IP (if available)
- **userAgent**: User agent string
- **correlationId**: Correlation ID for distributed tracing

## Integration with StoreService

The `StoreService` automatically uses request context for:
- User ID resolution (falls back to context if not provided)
- Request ID inclusion in audit logs
- Organization ID tracking

Example:
```typescript
// Before: userId required
store.updateRoomStatus(roomId, status, 'admin');

// After: userId optional, uses context
store.updateRoomStatus(roomId, status);
```

## Testing

To test request context extraction:

1. Open browser console
2. Run:
```javascript
// Access context from window (if exposed for testing)
console.log(window.__requestContext);
```

Or use the helper in code:
```typescript
import { getRequestContext } from './contexts/RequestContext';
const ctx = getRequestContext();
console.log('Request ID:', ctx.requestId);
console.log('User ID:', ctx.userId);
```

## Request ID Format

Request IDs follow the format: `REQ-{timestamp}-{random}`
Example: `REQ-1704067200000-ABC123`

## Notes

- Request context is automatically available throughout the React component tree
- Services can access context via `getRequestContext()` without React
- Context updates trigger new request ID generation
- All audit logs automatically include request context metadata

