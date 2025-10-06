// src/app/shared/utils/http.util.ts
export type QueryValue = string | number | boolean | null | undefined;

export type FetchOptions = Omit<RequestInit, 'signal' | 'body'> & {
  baseUrl?: string;
  query?: Record<string, QueryValue>;
  timeoutMs?: number;
  parse?: 'auto' | 'json' | 'text' | 'blob';
  body?: unknown;
};

export type FetchError = {
  message: string;
  status?: number;
  details?: unknown;
};

export type FetchResult<T> = {
  data: T | null;
  error: FetchError | null;
  status: number;
  headers: Headers;
};

const withQuery = (input: string | URL, query?: Record<string, QueryValue>): URL => {
  const url = new URL(typeof input === 'string' ? input : input.toString(), 'resolve://');
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  // usunięcie sztucznego base `resolve://`
  const out = new URL(url.pathname + url.search + url.hash, 'http://local');
  return new URL(out.toString().replace('http://local', ''));
};

const isJsonResponse = (r: Response): boolean => {
  const t = r.headers.get('content-type') || '';
  return t.includes('application/json') || t.endsWith('+json');
};

const readBody = async (r: Response, mode: 'auto' | 'json' | 'text' | 'blob'): Promise<unknown> => {
  if (r.status === 204) return null;
  if (mode === 'json') return r.json();
  if (mode === 'text') return r.text();
  if (mode === 'blob') return r.blob();
  if (isJsonResponse(r)) {
    try {
      return await r.json();
    } catch {
      return null;
    }
  }
  try {
    return await r.text();
  } catch {
    return null;
  }
};

const buildUrl = (input: string, baseUrl?: string, query?: Record<string, QueryValue>): string => {
  const url = baseUrl && input.startsWith('/') ? new URL(input, baseUrl).toString() : input;
  return withQuery(url, query).toString();
};

const ensureHeaders = (h?: HeadersInit): Headers => new Headers(h ?? {});

const prepareBody = (init: RequestInit & { body?: unknown }): RequestInit => {
  const headers = ensureHeaders(init.headers);
  const method = (init.method ?? 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') return { ...init, headers };

  let body = init.body as unknown;
  const hasContentType = !!headers.get('content-type');

  if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob)) {
    if (!hasContentType) headers.set('content-type', 'application/json');
    body = JSON.stringify(body);
  }

  return { ...init, headers, body: body as BodyInit | undefined };
};

const coreFetch = async <T = unknown>(input: string, options: FetchOptions = {}): Promise<FetchResult<T>> => {
  const {
    baseUrl,
    query,
    timeoutMs = 15000,
    parse = 'auto',
    body,
    ...rest
  } = options;

  const url = buildUrl(input, baseUrl, query);
  const controller = new AbortController();
  const id = timeoutMs > 0 ? setTimeout(() => controller.abort('timeout'), timeoutMs) : undefined;

  try {
    const reqInit = prepareBody({ ...rest, method: rest.method, body: body as any, signal: controller.signal });
    const res = await fetch(url, reqInit);
    const payload = await readBody(res, parse);

    if (!res.ok) {
      const message =
        typeof payload === 'string' ?
          payload :
          (payload as any)?.message || res.statusText || 'Request failed';
      return { data: null, error: { message, status: res.status, details: payload }, status: res.status, headers: res.headers };
    }

    return {
      data: (typeof payload === 'string' || payload === null) ? (payload as unknown as T) : (payload as T),
      error: null,
      status: res.status,
      headers: res.headers,
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Network error';
    return { data: null, error: { message }, status: 0, headers: new Headers() };
  } finally {
    if (id) clearTimeout(id);
  }
};

export const http = {
  get<T = unknown>(url: string, options?: Omit<FetchOptions, 'method' | 'body'>) {
    return coreFetch<T>(url, { ...options, method: 'GET' });
  },
  post<T = unknown>(url: string, body?: unknown, options?: Omit<FetchOptions, 'method'>) {
    return coreFetch<T>(url, { ...options, method: 'POST', body });
  },
  put<T = unknown>(url: string, body?: unknown, options?: Omit<FetchOptions, 'method'>) {
    return coreFetch<T>(url, { ...options, method: 'PUT', body });
  },
  patch<T = unknown>(url: string, body?: unknown, options?: Omit<FetchOptions, 'method'>) {
    return coreFetch<T>(url, { ...options, method: 'PATCH', body });
  },
  delete<T = unknown>(url: string, options?: Omit<FetchOptions, 'method' | 'body'>) {
    return coreFetch<T>(url, { ...options, method: 'DELETE' });
  },
};

// Przykład:
// const { data, error, status } = await http.get<YourDto>('/api/convert', { baseUrl: origin, query: { from: 'USD', to: 'EUR', amount: 5 } });
