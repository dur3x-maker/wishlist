const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface User {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  wishlist_id: string;
  title: string;
  url: string | null;
  price_cents: number | null;
  currency: string;
  image_url: string | null;
  status: string;
  reserved: boolean;
  reserved_at: string | null;
  created_at: string;
  total_contributed: number;
  reservations: Reservation[];
  contributions: Contribution[];
}

export interface Reservation {
  id: string;
  reserver_display_name: string;
  created_at: string;
}

export interface Contribution {
  id: string;
  contributor_display_name: string;
  amount_cents: number;
  created_at: string;
}

export interface Wishlist {
  id: string;
  owner_user_id: string;
  title: string;
  description: string;
  access_token: string;
  is_public: boolean;
  created_at: string;
  items: WishlistItem[];
}

export interface WishlistListItem {
  id: string;
  title: string;
  description: string;
  access_token: string;
  is_public: boolean;
  created_at: string;
  item_count: number;
}

export interface ScrapeResult {
  title: string | null;
  image_url: string | null;
  price_cents: number | null;
  currency: string | null;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new ApiError(body.detail || "Request failed", res.status);
  }

  return res.json();
}

// ── Auth ─────────────────────────────────────────────
export const api = {
  auth: {
    register(email: string, password: string, display_name: string) {
      return request<{ access_token: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, display_name }),
      });
    },
    login(email: string, password: string) {
      return request<{ access_token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },
    me() {
      return request<User>("/api/auth/me");
    },
  },

  // ── Wishlists ────────────────────────────────────────
  wishlists: {
    create(title: string, description: string = "", is_public: boolean = true) {
      return request<Wishlist>("/api/wishlists", {
        method: "POST",
        body: JSON.stringify({ title, description, is_public }),
      });
    },
    list() {
      return request<WishlistListItem[]>("/api/wishlists");
    },
    get(id: string) {
      return request<Wishlist>(`/api/wishlists/${id}`);
    },
    update(id: string, data: { title?: string; description?: string; is_public?: boolean }) {
      return request<Wishlist>(`/api/wishlists/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    getPublic(accessToken: string) {
      return request<Wishlist>(`/api/wishlists/public/${accessToken}`);
    },
  },

  // ── Items ────────────────────────────────────────────
  items: {
    create(
      wishlistId: string,
      data: {
        title: string;
        url?: string;
        price_cents?: number;
        currency?: string;
        image_url?: string;
      }
    ) {
      return request<WishlistItem>(`/api/wishlists/${wishlistId}/items`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update(
      wishlistId: string,
      itemId: string,
      data: {
        title?: string;
        url?: string;
        price_cents?: number;
        currency?: string;
        image_url?: string;
      }
    ) {
      return request<WishlistItem>(`/api/wishlists/${wishlistId}/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    archive(wishlistId: string, itemId: string) {
      return request<WishlistItem>(
        `/api/wishlists/${wishlistId}/items/${itemId}/archive`,
        { method: "POST" }
      );
    },
    unarchive(wishlistId: string, itemId: string) {
      return request<WishlistItem>(
        `/api/wishlists/${wishlistId}/items/${itemId}/unarchive`,
        { method: "POST" }
      );
    },
    reserve(accessToken: string, itemId: string, display_name: string) {
      return request<WishlistItem>(
        `/api/wishlists/public/${accessToken}/items/${itemId}/reserve`,
        { method: "POST", body: JSON.stringify({ display_name }) }
      );
    },
    unreserve(accessToken: string, itemId: string) {
      return request<WishlistItem>(
        `/api/wishlists/public/${accessToken}/items/${itemId}/unreserve`,
        { method: "POST" }
      );
    },
    contribute(
      accessToken: string,
      itemId: string,
      display_name: string,
      amount_cents: number
    ) {
      return request<WishlistItem>(
        `/api/wishlists/public/${accessToken}/items/${itemId}/contribute`,
        {
          method: "POST",
          body: JSON.stringify({ display_name, amount_cents }),
        }
      );
    },
  },

  // ── Scrape ───────────────────────────────────────────
  scrape(url: string) {
    return request<ScrapeResult>("/api/scrape", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  },
};

// ── WebSocket ──────────────────────────────────────────
export function connectWishlistWS(
  wishlistId: string,
  onEvent: (event: { event: string; item_id: string; data: WishlistItem }) => void
): () => void {
  let cancelled = false;
  let ws: WebSocket | null = null;

  function connect() {
    if (cancelled) return;
    const wsBase = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
    ws = new WebSocket(`${wsBase}/ws/wishlists/${wishlistId}`);

    ws.onmessage = (e) => {
      if (cancelled) return;
      try {
        const data = JSON.parse(e.data);
        onEvent(data);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (cancelled) return;
      // Reconnect after 2s
      setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      // onclose will fire after onerror, triggering reconnect
    };
  }

  connect();

  return () => {
    cancelled = true;
    if (ws) {
      ws.onclose = null;
      ws.close();
    }
  };
}
