export interface User {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface WishlistListItem {
  id: string;
  title: string;
  description: string;
  access_token: string;
  is_public: boolean;
  deadline: string | null;
  created_at: string;
  item_count: number;
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

export interface Item {
  id: string;
  wishlist_id: string;
  title: string;
  url: string | null;
  price_cents: number | null;
  currency: string;
  image_url: string | null;
  status: 'active' | 'archived' | 'funded' | 'expired';
  reserved: boolean;
  is_reserved: boolean;
  reserved_by_current_user: boolean;
  reserved_at: string | null;
  created_at: string;
  total_contributed: number;
  reservations: Reservation[];
  contributions: Contribution[];
}

export interface Wishlist {
  id: string;
  owner_user_id: string;
  title: string;
  description: string;
  access_token: string;
  is_public: boolean;
  deadline: string | null;
  created_at: string;
  items: Item[];
}

export interface ScrapeResult {
  title: string | null;
  image_url: string | null;
  price_cents: number | null;
  currency: string | null;
}

export type WSEventName =
  | 'item_created'
  | 'item_updated'
  | 'item_reserved'
  | 'item_unreserved'
  | 'contribution_added';

export interface WSMessage {
  event: WSEventName;
  item_id: string;
  data: Item;
}
