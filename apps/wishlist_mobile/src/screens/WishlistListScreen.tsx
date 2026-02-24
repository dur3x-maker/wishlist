import React, {useCallback, useState, useEffect, useRef, memo} from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
  Animated,
  PanResponder,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {listWishlists, deleteWishlist} from '../api/wishlists';
import {WEB_BASE_URL} from '../api/client';
import {ApiError} from '../api/client';
import {useAuthContext} from '../hooks/AuthContext';
import {colors, spacing, typography, shadows, borderRadius} from '../theme';
import {getFullCountdown, isExpired} from '../utils/countdown';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import type {WishlistListItem} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Main'> & {
  onLogout: () => void;
};

export default function WishlistListScreen({navigation, onLogout}: Props) {
  const queryClient = useQueryClient();
  const {user} = useAuthContext();
  const [refreshKey, setRefreshKey] = useState(0);
  const {data, isLoading, isError, refetch} = useQuery<WishlistListItem[]>({
    queryKey: ['wishlists'],
    queryFn: listWishlists,
  });

  // Live countdown: update every second
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const handleCreate = useCallback(() => {
    navigation.navigate('CreateWishlist');
  }, [navigation]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          android_ripple={null}
          onPress={onLogout}
          style={({pressed}) => [styles.headerMarginR, pressed && styles.headerPressed]}>
          <Text style={styles.headerBtn}>Logout</Text>
        </Pressable>
      ),
      headerLeft: () => (
        <Pressable
          android_ripple={null}
          onPress={handleCreate}
          style={({pressed}) => [styles.headerMarginL, pressed && styles.headerPressed]}>
          <Text style={styles.headerPlus}>+</Text>
        </Pressable>
      ),
    });
  }, [navigation, onLogout, handleCreate]);

  const handleDelete = useCallback(
    (id: string, title: string) => {
      Alert.alert(
        'Delete wishlist',
        `This will permanently delete "${title}" and all its items. This action cannot be undone.`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteWishlist(id);
                queryClient.invalidateQueries({queryKey: ['wishlists']});
              } catch (e: any) {
                // Show ONE alert only — do not propagate further
                const status = e instanceof ApiError ? e.status : 0;
                if (status === 500 || status === 400 || status === 409) {
                  Alert.alert(
                    'Cannot delete',
                    'This wishlist may contain items. Delete all items first, then try again.',
                  );
                } else {
                  Alert.alert('Error', e.message ?? 'Failed to delete wishlist');
                }
              }
            },
          },
        ],
      );
    },
    [queryClient],
  );

  const handleShare = useCallback((accessToken: string) => {
    const publicUrl = `${WEB_BASE_URL}/w/${accessToken}`;
    Share.share({message: `Check out my wishlist: ${publicUrl}`, url: publicUrl});
  }, []);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const keyExtractor = useCallback((i: WishlistListItem) => i.id, []);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load wishlists</Text>
        <Pressable
          android_ripple={null}
          onPress={handleRetry}
          style={({pressed}) => [styles.retryBtn, pressed && styles.pressedCard]}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const hasWishlists = data && data.length > 0;

  const renderItem = ({item}: {item: WishlistListItem}) => (
    <SwipeableCard
      item={item}
      onPress={() => navigation.navigate('WishlistDetail', {wishlistId: item.id})}
      onDelete={() => handleDelete(item.id, item.title)}
      onShare={() => handleShare(item.access_token)}
      refreshKey={refreshKey}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome, <Text style={styles.welcomeName}>{user?.display_name || 'there'}!</Text>
        </Text>
      </View>
      {!hasWishlists ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIconPlus}>+</Text>
          </View>
          <Text style={styles.emptyTitle}>No wishlists yet</Text>
          <Text style={styles.emptySubtitle}>
            Create a wishlist to organize your wishes and share them with friends
          </Text>
          <Pressable
            android_ripple={null}
            style={({pressed}) => [styles.primaryButton, pressed && styles.pressedCard]}
            onPress={handleCreate}>
            <Text style={styles.primaryButtonText}>+ Add your first wishlist</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <FlatList
            data={data ?? []}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListFooterComponent={
              (data?.length ?? 0) > 0 && (data?.length ?? 0) <= 2 ? (
                <View style={styles.listFooter}>
                  <Text style={styles.listFooterText}>Tap + to add more wishlists</Text>
                </View>
              ) : null
            }
          />
          <Pressable
            android_ripple={null}
            style={({pressed}) => [styles.fab, pressed && styles.fabPressed]}
            onPress={handleCreate}>
            <Text style={styles.fabText}>+</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const SwipeableCard = memo(function SwipeableCard({item, onPress, onDelete, onShare, refreshKey}: {
  item: WishlistListItem;
  onPress: () => void;
  onDelete: () => void;
  onShare: () => void;
  refreshKey: number;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [swiping, setSwiping] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (!hasAnimated) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      setHasAnimated(true);
    }
  }, [fadeAnim, hasAnimated]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: () => {
        setSwiping(true);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -100));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        setSwiping(false);
        if (gestureState.dx < -60) {
          Animated.timing(translateX, {
            toValue: -100,
            duration: 200,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const countdown = getFullCountdown(item.deadline);
  const expired = isExpired(item.deadline);

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.deleteBackground}>
        <Pressable
          android_ripple={null}
          style={styles.deleteButton}
          onPress={() => {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
            onDelete();
          }}>
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
      <Animated.View
        style={[styles.cardWrapper, {transform: [{translateX}], opacity: fadeAnim}]}
        {...panResponder.panHandlers}>
        <Pressable
          android_ripple={null}
          style={({pressed}) => [styles.card, pressed && !swiping && styles.pressedCard]}
          onPress={onPress}
          disabled={swiping}>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.description ? (
              <Text style={styles.cardDesc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            {item.deadline && !expired && (
              <Text style={styles.deadlineBadge}>
                ⏳ {countdown}
              </Text>
            )}
            {item.deadline && expired && (
              <Text style={styles.deadlineExpired}>
                Expired
              </Text>
            )}
            <View style={styles.metaRow}>
              <Text style={styles.cardMeta}>
                {item.item_count} item{item.item_count !== 1 ? 's' : ''}
              </Text>
              <Pressable
                android_ripple={null}
                onPress={onShare}
                style={({pressed}) => pressed && styles.headerPressed}>
                <Text style={styles.shareText}>Share</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  welcomeText: {
    ...typography.h3,
    color: colors.text.primary,
  },
  welcomeName: {
    color: colors.primary,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: 80,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  headerMarginR: {marginRight: spacing.xs, padding: spacing.xs},
  headerMarginL: {marginLeft: spacing.xs, padding: spacing.xs},
  headerPressed: {opacity: 0.6},
  headerBtn: {
    ...typography.small,
    color: colors.primary,
  },
  headerPlus: {
    fontSize: 24,
    lineHeight: 28,
    color: colors.primary,
  },
  swipeContainer: {
    marginBottom: spacing.md,
    position: 'relative',
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: colors.status.error,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    padding: spacing.lg,
  },
  deleteText: {
    color: colors.white,
    fontWeight: '600' as const,
    fontSize: 14,
  },
  cardWrapper: {
    backgroundColor: 'transparent',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  pressedCard: {
    opacity: 0.92,
    transform: [{scale: 0.98}],
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.h5,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  cardDesc: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  deadlineBadge: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600' as const,
    marginBottom: spacing.sm,
  },
  deadlineExpired: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontWeight: '500' as const,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.light,
  },
  cardMeta: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  shareText: {
    ...typography.smallBold,
    color: colors.primary,
  },
  errorText: {
    ...typography.body,
    color: colors.status.error,
    marginBottom: spacing.md,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  retryText: {
    ...typography.bodyBold,
    color: colors.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: colors.border.light,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emptyIconPlus: {
    fontSize: 32,
    color: colors.text.tertiary,
    lineHeight: 36,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxxl,
    ...shadows.md,
  },
  primaryButtonText: {
    ...typography.bodyBold,
    color: colors.white,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xxl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  fabPressed: {
    opacity: 0.92,
    transform: [{scale: 0.95}],
  },
  fabText: {
    fontSize: 28,
    color: colors.white,
    lineHeight: 30,
  },
  listFooter: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  listFooterText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
});
