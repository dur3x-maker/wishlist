import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = 'https://wishlist-esls.onrender.com';
export const WS_BASE_URL = 'wss://wishlist-esls.onrender.com';
export const WEB_BASE_URL = 'https://wishlist-web.onrender.com';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
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
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.detail ?? 'Request failed');
  }
  if (res.status === 204) {
    return undefined as unknown as T;
  }
  return res.json();
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
