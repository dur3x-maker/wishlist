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
import LinearGradient from 'react-native-linear-gradient';
import {useFocusEffect} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {listWishlists, deleteWishlist} from '../api/wishlists';
import {WEB_BASE_URL} from '../api/client';
import {ApiError} from '../api/client';
import {useAuthContext} from '../hooks/AuthContext';
import {colors, spacing, shadows, borderRadius} from '../theme';
import {getFullCountdown, isExpired} from '../utils/countdown';
import {GradientBackground, PrimaryButton} from '../components';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import type {WishlistListItem} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Main'> & {
  onLogout: () => void;
};

export default function WishlistListScreen({navigation, onLogout}: Props) {
  const queryClient = useQueryClient();
  const {user} = useAuthContext();
  const insets = useSafeAreaInsets();
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
      <GradientBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </GradientBackground>
    );
  }

  if (isError) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load wishlists</Text>
          <PrimaryButton title="Retry" onPress={handleRetry} />
        </View>
      </GradientBackground>
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
    <GradientBackground>
      <View style={[styles.header, {paddingTop: insets.top + spacing.lg}]}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.welcomeName}>{user?.display_name || 'there'} ✨</Text>
        </View>
        <Pressable
          android_ripple={null}
          onPress={onLogout}
          style={({pressed}) => [styles.logoutBtn, pressed && styles.pressed]}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
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
          <PrimaryButton title="+ Add your first wishlist" onPress={handleCreate} />
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
            <LinearGradient
              colors={[colors.primary, colors.primaryLight]}
              style={styles.fabGradient}>
              <Text style={styles.fabText}>+</Text>
            </LinearGradient>
          </Pressable>
        </>
      )}
    </GradientBackground>
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Force swipe position to zero on mount
    translateX.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      // Only show delete background after card is fully opaque
      setMounted(true);
    });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

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
      {mounted && (
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
      )}
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
              <View style={styles.deadlinePill}>
                <Text style={styles.deadlineBadge}>⏳ {countdown}</Text>
              </View>
            )}
            {item.deadline && expired && (
              <View style={styles.expiredPill}>
                <Text style={styles.deadlineExpired}>Expired</Text>
              </View>
            )}
            <View style={styles.metaRow}>
              <Text style={styles.cardMeta}>
                {item.item_count} item{item.item_count !== 1 ? 's' : ''}
              </Text>
              <Pressable
                android_ripple={null}
                onPress={onShare}
                style={({pressed}) => pressed && styles.pressed}>
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
  header: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  welcomeText: {
    fontSize: 15,
    color: colors.text.tertiary,
  },
  welcomeName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.white,
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  logoutText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '600' as const,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: 100,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  pressed: {opacity: 0.6},
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
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    ...shadows.md,
  },
  pressedCard: {
    opacity: 0.88,
    transform: [{scale: 0.97}],
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  cardDesc: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  deadlinePill: {
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  deadlineBadge: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600' as const,
  },
  expiredPill: {
    backgroundColor: 'rgba(248,113,113,0.15)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  deadlineExpired: {
    fontSize: 12,
    color: colors.status.error,
    fontWeight: '500' as const,
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
    fontSize: 12,
    color: colors.text.tertiary,
  },
  shareText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.accent,
  },
  errorText: {
    fontSize: 16,
    color: colors.status.error,
    marginBottom: spacing.lg,
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
    borderColor: colors.border.medium,
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
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.white,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
    lineHeight: 24,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xxxl,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.glow,
  },
  fabPressed: {
    opacity: 0.88,
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
    fontSize: 12,
    color: colors.text.tertiary,
  },
});
