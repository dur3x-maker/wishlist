import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = 'https://wishlist-esls.onrender.com';
export const WS_BASE_URL = 'wss://wishlist-esls.onrender.com';
export const WEB_BASE_URL = 'https://wishlist-ecru-one.vercel.app';

// Diagnostic: test raw connectivity (deferred to avoid racing RN bridge init)
export async function pingBackend(): Promise<void> {
  const pingUrl = `${BASE_URL}/api/health`;
  console.log('[NET DIAG] PINGING:', pingUrl);
  try {
    const r = await fetch(pingUrl, {method: 'GET'});
    console.log('[NET DIAG] PING OK, status:', r.status);
  } catch (e: any) {
    console.error('[NET DIAG] PING FAILED:', e?.name, e?.message, e);
  }
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const fullUrl = `${BASE_URL}${path}`;
  console.log('[apiFetch] →', options.method ?? 'GET', fullUrl);

  let lastError: any;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.log(`[apiFetch] retry ${attempt}/${MAX_RETRIES}`, fullUrl);
      await delay(RETRY_DELAY_MS);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const token = await AsyncStorage.getItem('access_token');
      console.log('[apiFetch] token:', token ? `Bearer ${token.slice(0, 8)}…` : 'NONE');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(fullUrl, {
        ...options,
        headers,
        signal: controller.signal,
      });
      console.log('[apiFetch] ←', res.status, fullUrl);
      if (res.status === 401) {
        console.error('[apiFetch] 401 — clearing auth state');
        await AsyncStorage.removeItem('access_token');
        throw new ApiError(401, 'Session expired. Please log in again.');
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('[apiFetch] ERROR body:', JSON.stringify(body), 'status:', res.status, 'url:', fullUrl);
        throw new ApiError(res.status, body?.detail ?? 'Request failed');
      }
      if (res.status === 204) {
        return undefined as unknown as T;
      }
      const text = await res.text();
      if (!text) {
        return undefined as unknown as T;
      }
      return JSON.parse(text) as T;
    } catch (e: any) {
      lastError = e;
      if (e instanceof ApiError) throw e;
      if (e?.name === 'AbortError') {
        console.error('[apiFetch] timeout', path);
        throw new ApiError(0, 'Request timed out');
      }
      // Retry on TypeError (network failure)
      if (e instanceof TypeError && attempt < MAX_RETRIES) {
        console.warn(`[apiFetch] network error: ${e.message} — will retry`);
        continue;
      }
      console.error('[apiFetch] error', path, 'type:', e?.name, 'msg:', e?.message, e);
      throw e;
    } finally {
      clearTimeout(timeout);
    }
  }
  // Should not reach here, but safety net
  throw lastError;
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  console.log('[apiUpload] →', path);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const token = await AsyncStorage.getItem('access_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    });
    console.log('[apiUpload] ←', res.status, path);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body?.detail ?? 'Upload failed');
    }
    const text = await res.text();
    if (!text) {
      return undefined as unknown as T;
    }
    return JSON.parse(text) as T;
  } catch (e: any) {
    if (e instanceof ApiError) throw e;
    if (e?.name === 'AbortError') {
      console.error('[apiUpload] timeout', path);
      throw new ApiError(0, 'Upload timed out');
    }
    console.error('[apiUpload] error', path, e);
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
