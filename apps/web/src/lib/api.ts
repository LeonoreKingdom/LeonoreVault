'use client';

import {
  mockDownload,
  mockRequest,
  mockUploadAttachments,
} from '@/lib/mock-service';

/**
 * Local service boundary used by the frontend-first mock slice.
 * The method signatures mirror the future API contract so the UI does not
 * need to know whether data comes from a mock, Next route handler, or Turso.
 */
async function request<T>(
  method: string,
  path: string,
  options?: { body?: unknown; params?: Record<string, string> },
): Promise<T> {
  return mockRequest<T>(method, path, options);
}

/** GET request */
export function apiGet<T>(path: string, params?: Record<string, string>) {
  return request<T>('GET', path, { params });
}

/** POST request */
export function apiPost<T>(path: string, body?: unknown) {
  return request<T>('POST', path, { body });
}

/** PATCH request */
export function apiPatch<T>(path: string, body?: unknown) {
  return request<T>('PATCH', path, { body });
}

/** DELETE request */
export function apiDelete<T>(path: string) {
  return request<T>('DELETE', path);
}

/** Download a mock binary while preserving the future download contract. */
export function apiDownload(
  path: string,
  options?: { method?: 'GET' | 'POST'; body?: unknown },
): Promise<Blob> {
  void options;
  return mockDownload(path);
}

/**
 * Upload files to the local mock service with simulated progress.
 * The callback remains compatible with the future presigned R2 upload flow.
 */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> {
  onProgress?.(20);
  const itemMatch = path.match(/\/items\/([^/]+)\/attachments/);
  if (!itemMatch) throw new Error('Invalid attachment upload path');

  const result = await mockUploadAttachments(itemMatch[1]!, formData);
  onProgress?.(100);
  return result as T;
}
