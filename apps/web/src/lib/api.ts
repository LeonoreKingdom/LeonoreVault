'use client';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

type RequestOptions = {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
};

type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  params?: RequestOptions['params'];
};

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const baseUrl =
    API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const url = new URL(path, `${baseUrl}/`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;
  return response.json();
}

function errorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const value = payload as {
    error?: { message?: string } | string;
    message?: string;
  };
  if (typeof value.error === 'string') return value.error;
  if (value.error?.message) return value.error.message;
  if (value.message) return value.message;
  return fallback;
}

/** Make an authenticated request and return the raw JSON response. */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { params, ...requestInit } = options;
  const body = requestInit.body;
  const headers = new Headers(requestInit.headers);
  if (body !== undefined && !(body instanceof FormData) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(buildUrl(path, params), {
    ...requestInit,
    headers,
    credentials: 'include',
    body:
      body !== undefined && !(body instanceof FormData) && typeof body !== 'string'
        ? JSON.stringify(body)
        : body,
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(errorMessage(payload, `Request failed with status ${response.status}`));
  }
  return payload as T;
}

/** Make an API request and unwrap LeonoreVault's `{ success, data }` envelope. */
async function request<T>(method: string, path: string, options?: RequestOptions): Promise<T> {
  const payload = await apiFetch<{ success: boolean; data: T }>(path, {
    method,
    params: options?.params,
    body: options?.body,
  });
  return payload.data;
}

export function apiGet<T>(path: string, params?: RequestOptions['params']) {
  return request<T>('GET', path, { params });
}

export function apiPost<T>(path: string, body?: unknown) {
  return request<T>('POST', path, { body });
}

export function apiPatch<T>(path: string, body?: unknown) {
  return request<T>('PATCH', path, { body });
}

export function apiDelete<T>(path: string) {
  return request<T>('DELETE', path);
}

/** Download a binary API response such as a QR image or label PDF. */
export async function apiDownload(
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown } = {},
): Promise<Blob> {
  const response = await fetch(buildUrl(path), {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: options.body === undefined ? undefined : { 'content-type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) {
    const payload = await readJson(response);
    throw new Error(errorMessage(payload, `Download failed with status ${response.status}`));
  }
  return response.blob();
}

/** Upload files to the API; the API stores bytes in Cloudflare R2. */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> {
  onProgress?.(10);
  const payload = await apiFetch<{ success: boolean; data: T }>(path, {
    method: 'POST',
    body: formData,
  });
  onProgress?.(100);
  return payload.data;
}
