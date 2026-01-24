import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { UserRole } from '../types';

/**
 * Request Context - Unified context for tracking user, organization, and request metadata
 * Provides request-scoped information accessible throughout the application
 */
export interface RequestContext {
  orgId: string; // Organization/Tenant ID (default for single-tenant)
  userId: string; // Current user ID
  roles: UserRole[]; // User roles
  requestId: string; // Unique request ID for this operation/request
  ip?: string; // Client IP (if available)
  userAgent?: string; // User agent (if available)
  correlationId?: string; // Correlation ID for distributed tracing
}

interface RequestContextState {
  context: RequestContext;
  setContext: (updates: Partial<RequestContext>) => void;
  generateRequestId: () => string;
  resetContext: () => void;
}

const DEFAULT_ORG_ID = 'default-org';
const DEFAULT_USER_ID = 'system';

// Generate a unique request ID
const generateRequestId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `REQ-${timestamp}-${random}`;
};

// Create the context
const RequestContextContext = createContext<RequestContextState | undefined>(undefined);

/**
 * RequestContextProvider - Provides request context to the application
 * Should wrap the root of the application
 */
export const RequestContextProvider: React.FC<{
  children: ReactNode;
  initialUserId?: string;
  initialRoles?: UserRole[];
  initialOrgId?: string;
}> = ({ 
  children, 
  initialUserId = DEFAULT_USER_ID,
  initialRoles = [UserRole.ADMIN],
  initialOrgId = DEFAULT_ORG_ID
}) => {
  const [context, setContextState] = useState<RequestContext>(() => ({
    orgId: initialOrgId,
    userId: initialUserId,
    roles: initialRoles,
    requestId: generateRequestId(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    // IP would come from backend in a real system
  }));

  const setContext = useCallback((updates: Partial<RequestContext>) => {
    setContextState(prev => ({
      ...prev,
      ...updates,
      // Always generate new requestId when context changes significantly
      requestId: updates.userId !== prev.userId || updates.roles !== prev.roles 
        ? generateRequestId() 
        : prev.requestId
    }));
  }, []);

  const generateRequestIdFn = useCallback(() => {
    const newRequestId = generateRequestId();
    setContextState(prev => ({ ...prev, requestId: newRequestId }));
    return newRequestId;
  }, []);

  const resetContext = useCallback(() => {
    setContextState({
      orgId: initialOrgId,
      userId: initialUserId,
      roles: initialRoles,
      requestId: generateRequestId(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    });
  }, [initialOrgId, initialUserId, initialRoles]);

  const value = useMemo(() => ({
    context,
    setContext,
    generateRequestId: generateRequestIdFn,
    resetContext
  }), [context, setContext, generateRequestIdFn, resetContext]);

  return (
    <RequestContextContext.Provider value={value}>
      {children}
    </RequestContextContext.Provider>
  );
};

/**
 * useRequestContext - Hook to access request context
 * Throws error if used outside RequestContextProvider
 */
export const useRequestContext = (): RequestContextState => {
  const context = useContext(RequestContextContext);
  if (!context) {
    throw new Error('useRequestContext must be used within RequestContextProvider');
  }
  return context;
};

/**
 * getRequestContext - Synchronous access to current request context
 * Use this in non-React contexts (services, utilities)
 * Returns default context if not in React tree (for testing/edge cases)
 */
let globalRequestContext: RequestContext | null = null;

export const setGlobalRequestContext = (ctx: RequestContext) => {
  globalRequestContext = ctx;
};

export const getRequestContext = (): RequestContext => {
  if (globalRequestContext) {
    return globalRequestContext;
  }
  // Fallback for non-React contexts
  return {
    orgId: DEFAULT_ORG_ID,
    userId: DEFAULT_USER_ID,
    roles: [UserRole.ADMIN],
    requestId: generateRequestId(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };
};

/**
 * withRequestContext - HOC to inject request context into components
 * Alternative to useRequestContext hook
 */
export const withRequestContext = <P extends object>(
  Component: React.ComponentType<P & { requestContext: RequestContext }>
) => {
  return (props: P) => {
    const { context } = useRequestContext();
    return <Component {...props} requestContext={context} />;
  };
};

