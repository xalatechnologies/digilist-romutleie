/**
 * API Client Utility
 * Handles all backend API calls with automatic request context headers
 */

import { getRequestContext } from '../contexts/RequestContext';
import { UserRole } from '../types';

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface ApiError {
  error: string;
  message?: string;
  status?: number;
}

/**
 * API Client class
 * Automatically attaches request context headers
 */
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Get request headers with context
   */
  private getHeaders(customHeaders?: Record<string, string>): HeadersInit {
    const context = getRequestContext();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'x-request-id': context.requestId,
      ...customHeaders,
    };

    // Add user context if available
    if (context.userId && context.userId !== 'system') {
      headers['x-user-id'] = context.userId;
    }

    if (context.roles && context.roles.length > 0) {
      headers['x-user-roles'] = context.roles.join(',');
    }

    return headers;
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      const error: ApiError = {
        error: errorData.error || 'API Error',
        message: errorData.message,
        status: response.status,
      };
      throw error;
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${this.baseURL}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

