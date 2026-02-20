import {WS_BASE_URL} from '../api/client';
import type {WSMessage} from '../types';

type MessageHandler = (msg: WSMessage) => void;

export class WishlistSocket {
  private ws: WebSocket | null = null;
  private wishlistId: string;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  constructor(wishlistId: string) {
    this.wishlistId = wishlistId;
  }

  connect(): void {
    this.shouldReconnect = true;
    this._open();
  }

  private _open(): void {
    const url = `${WS_BASE_URL}/ws/wishlists/${this.wishlistId}`;
    this.ws = new WebSocket(url);

    this.ws.onmessage = (e) => {
      try {
        const msg: WSMessage = JSON.parse(e.data);
        this.handlers.forEach((h) => h(msg));
      } catch (e) {
        console.error('WebSocket: malformed frame', e);
      }
    };

    this.ws.onclose = () => {
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this._open(), 3000);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  addHandler(handler: MessageHandler): void {
    this.handlers.add(handler);
  }

  removeHandler(handler: MessageHandler): void {
    this.handlers.delete(handler);
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }
}
