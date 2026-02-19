import {apiFetch} from './client';
import type {Wishlist, WishlistListItem} from '../types';

export async function listWishlists(): Promise<WishlistListItem[]> {
  return apiFetch<WishlistListItem[]>('/api/wishlists');
}

export async function getWishlist(id: string): Promise<Wishlist> {
  return apiFetch<Wishlist>(`/api/wishlists/${id}`);
}

export async function getPublicWishlist(accessToken: string): Promise<Wishlist> {
  return apiFetch<Wishlist>(`/api/wishlists/public/${accessToken}`);
}

export async function createWishlist(body: {
  title: string;
  description?: string;
  is_public?: boolean;
  deadline?: string | null;
}): Promise<Wishlist> {
  return apiFetch<Wishlist>('/api/wishlists', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteWishlist(id: string): Promise<void> {
  return apiFetch<void>(`/api/wishlists/${id}`, {method: 'DELETE'});
}
