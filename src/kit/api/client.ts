export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  support_id?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    page?: number;
    limit?: number;
    total_items?: number;
    total_pages?: number;
  };
}

export interface RequestOptions extends RequestInit {
  noCache?: boolean;
  ttlMs?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

interface CacheEntry<T> {
  response: ApiResponse<T>;
  expiresAt: number;
}

class ApiClient {
  private baseUrl: string;
  private cache = new Map<string, CacheEntry<unknown>>();
  private inFlightRequests = new Map<string, Promise<ApiResponse<any>>>();

  constructor() {
    this.baseUrl = (typeof import.meta !== 'undefined' && (import.meta as Record<string, any>).env?.VITE_API_BASE_URL) || '/api';
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('iclever_token');
  }

  private getActiveOrgId(): string | null {
    return localStorage.getItem('iclever_active_org_id');
  }

  /**
   * Sanitizes header values to prevent HTTP response splitting / CRLF injection.
   */
  private sanitizeHeaderValue(val: string): string {
    return val.replace(/[\r\n]/g, '').trim();
  }

  private generateCorrelationId(): string {
    return 'req-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
  }

  /**
   * Clears the in-memory cache, optionally filtering by endpoint prefix.
   */
  public clearCache(prefix?: string): void {
    if (!prefix) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.includes(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const method = (options.method || 'GET').toUpperCase();
    const token = this.getAuthToken();
    const orgId = this.getActiveOrgId();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Correlation-ID': this.generateCorrelationId(),
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${this.sanitizeHeaderValue(token)}`;
    }
    if (orgId) {
      headers['X-Organization-ID'] = this.sanitizeHeaderValue(orgId);
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    // Cache & Deduplication for GET requests
    if (method === 'GET' && !options.noCache) {
      const cacheKey = `${url}?org=${orgId || ''}`;
      const cached = this.cache.get(cacheKey) as CacheEntry<T> | undefined;

      if (cached && cached.expiresAt > Date.now()) {
        return cached.response;
      }

      // In-flight deduplication
      if (this.inFlightRequests.has(cacheKey)) {
        return this.inFlightRequests.get(cacheKey) as Promise<ApiResponse<T>>;
      }

      const executeGet = async (): Promise<ApiResponse<T>> => {
        try {
          const res = await this.executeFetch<T>(url, { ...options, headers });
          if (res.success && res.data) {
            const ttl = options.ttlMs ?? 15000; // 15 seconds default cache for idempotent GET
            this.cache.set(cacheKey, {
              response: res,
              expiresAt: Date.now() + ttl,
            });
          }
          return res;
        } finally {
          this.inFlightRequests.delete(cacheKey);
        }
      };

      const requestPromise = executeGet();
      this.inFlightRequests.set(cacheKey, requestPromise);
      return requestPromise;
    }

    // For state-mutating requests (POST, PUT, DELETE), automatically invalidate cached data
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      this.clearCache();
    }

    return this.executeFetch<T>(url, { ...options, headers });
  }

  private async executeFetch<T>(url: string, options: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, options);

      if (response.status === 401) {
        localStorage.removeItem('iclever_token');
        localStorage.removeItem('iclever_active_role');
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          // Safe navigation without exposing open redirect parameters
          window.location.href = '/login';
        }
      }

      const json: ApiResponse<T> = await response.json();
      if (!response.ok && !json.error) {
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: response.statusText || 'Request failed',
          },
        };
      }

      return json;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'ABORTED',
            message: 'Request was cancelled',
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: err instanceof Error ? err.message : 'Network error occurred',
        },
      };
    }
  }

  public get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
