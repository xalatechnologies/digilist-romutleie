/**
 * Request Context Helper Utilities
 * Provides utilities for working with request context outside React components
 */

import { getRequestContext, RequestContext } from '../contexts/RequestContext';

/**
 * Get current request ID
 * Useful for logging and tracing
 */
export const getCurrentRequestId = (): string => {
  return getRequestContext().requestId;
};

/**
 * Get current user ID
 */
export const getCurrentUserId = (): string => {
  return getRequestContext().userId;
};

/**
 * Get current organization ID
 */
export const getCurrentOrgId = (): string => {
  return getRequestContext().orgId;
};

/**
 * Get current user roles
 */
export const getCurrentUserRoles = (): string[] => {
  return getRequestContext().roles;
};

/**
 * Check if current user has a specific role
 */
export const hasRole = (role: string): boolean => {
  return getRequestContext().roles.includes(role as any);
};

/**
 * Get full request context
 */
export const getRequestContextData = (): RequestContext => {
  return getRequestContext();
};

/**
 * Create a correlation ID for distributed tracing
 * Can be used to link related operations across services
 */
export const createCorrelationId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `CORR-${timestamp}-${random}`;
};

