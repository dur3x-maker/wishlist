import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = 'https://wishlist-esls.onrender.com';
export const WS_BASE_URL = 'wss://wishlist-esls.onrender.com';
export const WEB_BASE_URL = 'https://wishlist-ecru-one.vercel.app';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  console.log('[apiFetch] →', options.method ?? 'GET', path);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const token = await AsyncStorage.getItem('access_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    console.log('[apiFetch] ←', res.status, path);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
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
    if (e instanceof ApiError) throw e;
    if (e?.name === 'AbortError') {
      console.error('[apiFetch] timeout', path);
      throw new ApiError(0, 'Request timed out');
    }
    console.error('[apiFetch] error', path, e);
    throw e;
  } finally {
    clearTimeout(timeout);
  }
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
