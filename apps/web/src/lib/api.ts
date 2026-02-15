'use client';

import { createClient } from '@/lib/supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Get the current session's access token.
 */
async function getToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Typed API client that auto-attaches the Supabase auth token.
 */
async function request<T>(
  method: string,
  path: string,
  options?: { body?: unknown; params?: Record<string, string> },
): Promise<T> {
  const token = await getToken();

  let url = `${API_URL}${path}`;
  if (options?.params) {
    const search = new URLSearchParams(options.params);
    url += `?${search.toString()}`;
  }

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
  });

  const json = await res.json();

  if (!res.ok) {
    const message = json?.error?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return json.data as T;
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

/**
 * Upload files via multipart/form-data with progress tracking.
 * Uses XMLHttpRequest because fetch doesn't support upload progress.
 */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> {
  const token = await getToken();
  const url = `${API_URL}${path}`;

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(json.data as T);
        } else {
          reject(new Error(json?.error?.message || `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error('Failed to parse upload response'));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.send(formData);
  });
}
