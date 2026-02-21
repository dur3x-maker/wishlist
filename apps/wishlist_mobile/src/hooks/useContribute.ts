import {useMutation, useQueryClient} from '@tanstack/react-query';
import {contributeItem} from '../api/items';
import type {Wishlist, Item} from '../types';

function patchItem(old: Wishlist | undefined, updated: Item): Wishlist | undefined {
  if (!old) return old;
  return {
    ...old,
    items: old.items.map((i) => (i.id === updated.id ? updated : i)),
  };
}

export function useContribute(wishlistId: string, accessToken: string) {
  const queryClient = useQueryClient();

  const contribute = useMutation({
    mutationFn: ({
      itemId,
      displayName,
      amountCents,
    }: {
      itemId: string;
      displayName: string;
      amountCents: number;
    }) => contributeItem(accessToken, itemId, displayName, amountCents),
    onMutate: async ({itemId, amountCents}) => {
      await queryClient.cancelQueries({queryKey: ['wishlist', wishlistId]});
      const previous = queryClient.getQueryData<Wishlist>(['wishlist', wishlistId]);
      queryClient.setQueryData<Wishlist>(['wishlist', wishlistId], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((i) =>
            i.id === itemId
              ? {...i, total_contributed: i.total_contributed + amountCents}
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
      queryClient.invalidateQueries({queryKey: ['wishlist', wishlistId]});
      queryClient.invalidateQueries({queryKey: ['wishlist-items', wishlistId]});
      queryClient.invalidateQueries({queryKey: ['wishlists']});
    },
  });

  return {contribute};
}
