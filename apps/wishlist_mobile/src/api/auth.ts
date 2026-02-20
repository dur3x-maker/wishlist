import AsyncStorage from '@react-native-async-storage/async-storage';
import {apiFetch} from './client';
import type {TokenResponse, User} from '../types';

export async function login(email: string, password: string): Promise<string> {
  const data = await apiFetch<TokenResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({email, password}),
  });
  await AsyncStorage.setItem('access_token', data.access_token);
  return data.access_token;
}

export async function register(
  email: string,
  password: string,
  display_name: string,
): Promise<string> {
  const data = await apiFetch<TokenResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({email, password, display_name}),
  });
  await AsyncStorage.setItem('access_token', data.access_token);
  return data.access_token;
}

export async function googleAuth(code: string, redirectUri: string): Promise<string> {
  const data = await apiFetch<TokenResponse>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({code, redirect_uri: redirectUri}),
  });
  await AsyncStorage.setItem('access_token', data.access_token);
  return data.access_token;
}

export async function getMe(): Promise<User> {
  return apiFetch<User>('/api/auth/me');
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem('access_token');
}

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem('access_token');
}
