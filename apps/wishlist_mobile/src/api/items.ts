import {apiFetch} from './client';
import type {Item} from '../types';

export async function createItem(
  wishlistId: string,
  body: {
    title: string;
    url?: string | null;
    price_cents?: number | null;
    currency?: string;
    image_url?: string | null;
  },
): Promise<Item> {
  return apiFetch<Item>(`/api/wishlists/${wishlistId}/items`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateItem(
  wishlistId: string,
  itemId: string,
  body: {
    title?: string;
    url?: string | null;
    price_cents?: number | null;
    currency?: string;
    image_url?: string | null;
  },
): Promise<Item> {
  return apiFetch<Item>(`/api/wishlists/${wishlistId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteItem(
  wishlistId: string,
  itemId: string,
): Promise<void> {
  return apiFetch<void>(`/api/wishlists/${wishlistId}/items/${itemId}`, {
    method: 'DELETE',
  });
}

export async function reserveItem(
  accessToken: string,
  itemId: string,
  displayName: string,
): Promise<Item> {
  return apiFetch<Item>(
    `/api/wishlists/public/${accessToken}/items/${itemId}/reserve`,
    {
      method: 'POST',
      body: JSON.stringify({display_name: displayName}),
    },
  );
}

export async function unreserveItem(
  accessToken: string,
  itemId: string,
): Promise<Item> {
  return apiFetch<Item>(
    `/api/wishlists/public/${accessToken}/items/${itemId}/unreserve`,
    {method: 'POST'},
  );
}

export async function contributeItem(
  accessToken: string,
  itemId: string,
  displayName: string,
  amountCents: number,
): Promise<Item> {
  return apiFetch<Item>(
    `/api/wishlists/public/${accessToken}/items/${itemId}/contribute`,
    {
      method: 'POST',
      body: JSON.stringify({display_name: displayName, amount_cents: amountCents}),
    },
  );
}
