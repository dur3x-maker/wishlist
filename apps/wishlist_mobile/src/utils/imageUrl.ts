import {BASE_URL} from '../api/client';

/**
 * Normalize an image URL from the backend into an absolute HTTPS URL
 * that React Native <Image> can render.
 *
 * Handles:
 * - null/undefined/empty → returns null
 * - relative paths ("/uploads/foo.jpg") → prepends BASE_URL
 * - localhost URLs → replaces origin with BASE_URL
 * - already absolute https URLs → returns as-is
 */
export function resolveImageUrl(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;

  const trimmed = raw.trim();

  // Already a valid absolute https URL (and not localhost)
  if (trimmed.startsWith('https://') && !trimmed.includes('localhost')) {
    return trimmed;
  }

  // Absolute http URL pointing to localhost → replace origin with BASE_URL
  if (trimmed.startsWith('http://localhost') || trimmed.startsWith('https://localhost')) {
    try {
      const u = new URL(trimmed);
      return `${BASE_URL}${u.pathname}${u.search}`;
    } catch {
      return `${BASE_URL}${trimmed}`;
    }
  }

  // Relative path
  if (trimmed.startsWith('/')) {
    return `${BASE_URL}${trimmed}`;
  }

  // http:// non-localhost — upgrade to https
  if (trimmed.startsWith('http://')) {
    return trimmed.replace('http://', 'https://');
  }

  // Fallback: treat as relative
  return `${BASE_URL}/${trimmed}`;
}
