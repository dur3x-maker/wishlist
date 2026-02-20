import {useMutation, useQueryClient} from '@tanstack/react-query';
import {reserveItem, unreserveItem} from '../api/items';
import type {Wishlist, Item} from '../types';

function patchItem(old: Wishlist | undefined, updated: Item): Wishlist | undefined {
  if (!old) return old;
  return {
    ...old,
    items: old.items.map((i) => (i.id === updated.id ? updated : i)),
  };
}

export function useReserve(wishlistId: string, accessToken: string) {
  const queryClient = useQueryClient();

  const reserve = useMutation({
    mutationFn: ({itemId, displayName}: {itemId: string; displayName: string}) =>
      reserveItem(accessToken, itemId, displayName),
    onMutate: async ({itemId}) => {
      await queryClient.cancelQueries({queryKey: ['wishlist', wishlistId]});
      const previous = queryClient.getQueryData<Wishlist>(['wishlist', wishlistId]);
      queryClient.setQueryData<Wishlist>(['wishlist', wishlistId], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((i) =>
            i.id === itemId
              ? {...i, reserved: true, is_reserved: true, reserved_by_current_user: true}
              : i,
          ),
        };
      });
      return {previous};
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['wishlist', wishlistId], ctx.previous);
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Wishlist>(['wishlist', wishlistId], (old) =>
        patchItem(old, updated),
      );
      queryClient.invalidateQueries({queryKey: ['wishlists']});
    },
  });

  const unreserve = useMutation({
    mutationFn: ({itemId}: {itemId: string}) => unreserveItem(accessToken, itemId),
    onMutate: async ({itemId}) => {
      await queryClient.cancelQueries({queryKey: ['wishlist', wishlistId]});
      const previous = queryClient.getQueryData<Wishlist>(['wishlist', wishlistId]);
      queryClient.setQueryData<Wishlist>(['wishlist', wishlistId], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((i) =>
            i.id === itemId
              ? {...i, reserved: false, is_reserved: false, reserved_by_current_user: false}
              : i,
          ),
        };
      });
      return {previous};
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['wishlist', wishlistId], ctx.previous);
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Wishlist>(['wishlist', wishlistId], (old) =>
        patchItem(old, updated),
      );
      queryClient.invalidateQueries({queryKey: ['wishlists']});
    },
  });

  return {reserve, unreserve};
}
