export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  support_id?: string;
  status?: number;
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

export interface RequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  noCache?: boolean;
  ttlMs?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
  body?: BodyInit | null;
}

interface CacheEntry<T> {
  response: ApiResponse<T>;
  expiresAt: number;
}

export const TOKEN_STORAGE_KEY = 'iclever_token';
export const ORG_STORAGE_KEY = 'iclever_active_org_id';
const DEFAULT_TIMEOUT_MS = 30_000;

function safeStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // storage unavailable
  }
}

/**
 * HTTP client for the iClever API. Responsibilities:
 * - attaches the session token, tenant id, locale and correlation id;
 * - caches idempotent GETs per session (never shared between users);
 * - de-duplicates concurrent identical GETs;
 * - invalidates the cache on every mutation and on session change;
 * - applies timeouts and retries only idempotent GETs on network failures;
 * - normalises every failure into `{ success: false, error }`.
 */
class ApiClient {
  private baseUrl: string;
  private cache = new Map<string, CacheEntry<unknown>>();
  private inFlightRequests = new Map<string, Promise<ApiResponse<unknown>>>();
  private locale = 'ru';
  private unauthorizedHandler: ((code: string) => void) | null = null;

  constructor() {
    this.baseUrl = ((import.meta.env?.VITE_API_BASE_URL as string | undefined) || '/api').replace(/\/+$/, '');
  }

  setLocale(locale: string) {
    if (this.locale !== locale) {
      this.locale = locale;
      // Localised payloads may differ per language.
      this.clearCache();
    }
  }

  /** Called when an authenticated request returns 401 (expired/invalidated session). */
  onUnauthorized(handler: ((code: string) => void) | null) {
    this.unauthorizedHandler = handler;
  }

  getToken(): string | null {
    return safeStorageGet(TOKEN_STORAGE_KEY);
  }

  /** Stores (or clears) the session. Always drops cached data from the previous session. */
  setSession(token: string | null, organizationId: string | null) {
    safeStorageSet(TOKEN_STORAGE_KEY, token);
    safeStorageSet(ORG_STORAGE_KEY, organizationId);
    this.clearCache();
    this.inFlightRequests.clear();
  }

  private sanitizeHeaderValue(val: string): string {
    // Prevents CRLF injection / response splitting via header values.
    return val.replace(/[\r\n]/g, '').trim();
  }

  private generateCorrelationId(): string {
    return 'req-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
  }

  public clearCache(prefix?: string): void {
    if (!prefix) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.includes(prefix)) this.cache.delete(key);
    }
  }

  private buildUrl(endpoint: string): string {
    let path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (!path.startsWith('/v1/')) path = `/v1${path}`;
    return `${this.baseUrl}${path}`;
  }

  private buildHeaders(extra: Record<string, string> | undefined, json: boolean): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Accept-Language': this.locale,
      'X-Correlation-ID': this.generateCorrelationId(),
      ...(extra || {}),
    };
    if (json) headers['Content-Type'] = 'application/json';
    const token = this.getToken();
    const orgId = safeStorageGet(ORG_STORAGE_KEY);
    if (token) headers['Authorization'] = `Bearer ${this.sanitizeHeaderValue(token)}`;
    if (orgId) headers['X-Organization-ID'] = this.sanitizeHeaderValue(orgId);
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}, json = true): Promise<ApiResponse<T>> {
    const method = (options.method || 'GET').toUpperCase();
    const url = this.buildUrl(endpoint);
    const headers = this.buildHeaders(options.headers, json && method !== 'GET');

    if (method === 'GET' && !options.noCache) {
      const cacheKey = `${this.getToken() || 'anon'}|${this.locale}|${url}`;
      const cached = this.cache.get(cacheKey) as CacheEntry<T> | undefined;
      if (cached && cached.expiresAt > Date.now()) return cached.response;
      const inflight = this.inFlightRequests.get(cacheKey);
      if (inflight) return inflight as Promise<ApiResponse<T>>;

      const promise = (async () => {
        try {
          let res = await this.executeFetch<T>(url, { ...options, method, headers });
          // Retry once on transport failure only; GET is idempotent.
          if (!res.success && res.error?.code === 'NETWORK_ERROR') res = await this.executeFetch<T>(url, { ...options, method, headers });
          if (res.success) this.cache.set(cacheKey, { response: res, expiresAt: Date.now() + (options.ttlMs ?? 15_000) });
          return res;
        } finally {
          this.inFlightRequests.delete(cacheKey);
        }
      })();
      this.inFlightRequests.set(cacheKey, promise as Promise<ApiResponse<unknown>>);
      return promise;
    }

    if (method !== 'GET') this.clearCache();
    return this.executeFetch<T>(url, { ...options, method, headers });
  }

  private async rawFetch(url: string, options: RequestOptions): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const external = options.signal;
    const onAbort = () => controller.abort(external?.reason);
    external?.addEventListener('abort', onAbort);
    try {
      const { noCache, ttlMs, timeoutMs, ...init } = options;
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
      external?.removeEventListener('abort', onAbort);
    }
  }

  private handleStatus(response: Response, json: ApiResponse<unknown> | null, url: string) {
    if (response.status === 401 && !url.includes('/identity/login') && !url.includes('/identity/invitations')) {
      this.unauthorizedHandler?.(json?.error?.code || 'UNAUTHORIZED');
    }
  }

  private networkError(err: unknown): ApiResponse<never> {
    if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
      const timedOut = err.name === 'TimeoutError' || (err as DOMException & { cause?: unknown }).message === 'Timeout';
      return { success: false, error: { code: timedOut ? 'TIMEOUT' : 'ABORTED', message: timedOut ? 'Request timed out' : 'Request was cancelled' } };
    }
    return { success: false, error: { code: 'NETWORK_ERROR', message: err instanceof Error ? err.message : 'Network error' } };
  }

  private async executeFetch<T>(url: string, options: RequestOptions): Promise<ApiResponse<T>> {
    try {
      const response = await this.rawFetch(url, options);
      let json: ApiResponse<T> | null = null;
      try {
        json = (await response.json()) as ApiResponse<T>;
      } catch {
        json = null;
      }
      this.handleStatus(response, json as ApiResponse<unknown> | null, url);
      if (!json || typeof json !== 'object' || typeof json.success !== 'boolean') {
        return { success: false, error: { code: response.ok ? 'INVALID_RESPONSE' : `HTTP_${response.status}`, message: response.statusText || 'Invalid response', status: response.status } };
      }
      if (!response.ok || !json.success) {
        return { success: false, error: { code: json.error?.code || `HTTP_${response.status}`, message: json.error?.message || 'Request failed', details: json.error?.details, status: response.status } };
      }
      return json;
    } catch (err) {
      return this.networkError(err);
    }
  }

  public get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
  }

  public put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) });
  }

  public patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) });
  }

  public delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /** multipart/form-data upload; the browser sets the boundary header. */
  public upload<T>(endpoint: string, form: FormData, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: form }, false);
  }

  /** Downloads a binary/text resource and returns it with the server-provided filename. */
  public async download(endpoint: string, fallbackName: string): Promise<ApiResponse<{ blob: Blob; filename: string }>> {
    const url = this.buildUrl(endpoint);
    try {
      const response = await this.rawFetch(url, { method: 'GET', headers: this.buildHeaders(undefined, false) });
      if (!response.ok) {
        let json: ApiResponse<unknown> | null = null;
        try {
          json = await response.json();
        } catch {
          json = null;
        }
        this.handleStatus(response, json, url);
        return { success: false, error: { code: json?.error?.code || `HTTP_${response.status}`, message: json?.error?.message || 'Download failed', status: response.status } };
      }
      const disposition = response.headers.get('Content-Disposition') || '';
      const match = /filename="?([^";]+)"?/i.exec(disposition);
      return { success: true, data: { blob: await response.blob(), filename: match?.[1] || fallbackName } };
    } catch (err) {
      return this.networkError(err);
    }
  }
}

export const api = new ApiClient();

/** Triggers a browser download for a Blob. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
