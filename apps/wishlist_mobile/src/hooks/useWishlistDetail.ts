import {useEffect, useRef} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {getWishlist} from '../api/wishlists';
import {WishlistSocket} from '../services/websocket';
import type {Wishlist, WSMessage, Item} from '../types';

export function useWishlistDetail(wishlistId: string) {
  const queryClient = useQueryClient();
  const socketRef = useRef<WishlistSocket | null>(null);

  const query = useQuery<Wishlist>({
    queryKey: ['wishlist', wishlistId],
    queryFn: () => getWishlist(wishlistId),
    staleTime: 0,
  });

  useEffect(() => {
    const socket = new WishlistSocket(wishlistId);

    const handler = (msg: WSMessage) => {
      queryClient.setQueryData<Wishlist>(['wishlist', wishlistId], (old) => {
        if (!old) return old;
        const incoming: Item = msg.data;
        let items = old.items;

        if (msg.event === 'item_created') {
          const exists = items.some((i) => i.id === incoming.id);
          items = exists ? items : [...items, incoming];
        } else if (
          msg.event === 'contribution_added' ||
          msg.event === 'contribution_created'
        ) {
          items = items.map((i) =>
            i.id === incoming.id
              ? {
                  ...i,
                  contributions: incoming.contributions,
                  total_contributed: incoming.total_contributed,
                  status: incoming.status,
                }
              : i,
          );
        } else if (
          msg.event === 'item_updated' ||
          msg.event === 'item_reserved' ||
          msg.event === 'item_unreserved'
        ) {
          items = items.map((i) => (i.id === incoming.id ? {...i, ...incoming} : i));
        }

        return {...old, items};
      });

      queryClient.invalidateQueries({queryKey: ['wishlist', wishlistId]});
    };

    socket.addHandler(handler);
    socket.connect();
    socketRef.current = socket;

    return () => {
      socket.removeHandler(handler);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [wishlistId, queryClient]);

  return query;
}
