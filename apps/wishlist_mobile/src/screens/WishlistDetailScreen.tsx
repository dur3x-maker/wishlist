import React, {useState, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Share,
  Image,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useFocusEffect} from '@react-navigation/native';
import {useWishlistDetail} from '../hooks/useWishlistDetail';
import {useReserve} from '../hooks/useReserve';
import {useAuthContext} from '../hooks/AuthContext';
import {WEB_BASE_URL} from '../api/client';
import {colors, spacing, shadows, borderRadius} from '../theme';
import {GradientBackground, PrimaryButton, GlassInput} from '../components';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import type {Item} from '../types';
import {resolveImageUrl} from '../utils/imageUrl';

type Props = NativeStackScreenProps<RootStackParamList, 'WishlistDetail'>;

const STATUS_COLORS: Record<string, string> = {
  active: colors.status.success,
  funded: colors.accent,
  expired: colors.status.warning,
};
const DEFAULT_STATUS_COLOR = colors.text.tertiary;

function AnimatedProgressBar({item}: {item: Item}) {
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const hasAnimatedRef = React.useRef(false);

  const progress = item.price_cents != null && item.price_cents > 0
    ? Math.min(100, Math.round((item.total_contributed / item.price_cents) * 100))
    : 0;
  const funded = (item.total_contributed / 100).toFixed(2);
  const total = item.price_cents != null ? (item.price_cents / 100).toFixed(2) : '0.00';
  const cur = item.currency || 'USD';

  React.useEffect(() => {
    if (!hasAnimatedRef.current) {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 600,
        useNativeDriver: false,
      }).start();
      hasAnimatedRef.current = true;
    } else {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [progressAnim, progress]);

  const animatedWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressSection}>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, {width: animatedWidth}]} />
      </View>
      {item.price_cents != null && item.price_cents > 0 && (
        <Text style={styles.progressLabel}>
          {cur} {funded} of {cur} {total} ({progress}%)
        </Text>
      )}
    </View>
  );
}

function SummaryBlock({items}: {items: Item[]}) {
  const totalItems = items.length;
  const totalValueCents = items.reduce((s, i) => s + (i.price_cents ?? 0), 0);
  const totalFundedCents = items.reduce((s, i) => s + i.total_contributed, 0);
  const fundedPct = totalValueCents > 0
    ? Math.round((totalFundedCents / totalValueCents) * 100)
    : 0;

  return (
    <View style={styles.summaryBlock}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{totalItems}</Text>
        <Text style={styles.summaryLabel}>Items</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>${(totalValueCents / 100).toFixed(0)}</Text>
        <Text style={styles.summaryLabel}>Total</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{fundedPct}%</Text>
        <Text style={styles.summaryLabel}>Funded</Text>
      </View>
    </View>
  );
}

export default function WishlistDetailScreen({route, navigation}: Props) {
  const {wishlistId} = route.params;
  const {user} = useAuthContext();
  const {data: wishlist, isLoading, isError, refetch} = useWishlistDetail(wishlistId);
  const {reserve, unreserve} = useReserve(
    wishlistId,
    wishlist?.access_token ?? '',
  );

  const [reserveModal, setReserveModal] = useState<{itemId: string} | null>(null);
  const [displayName, setDisplayName] = useState('');

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const isOwner = useMemo(
    () => !!user && !!wishlist && wishlist.owner_user_id === user.id,
    [user, wishlist],
  );

  const handleShare = useCallback(() => {
    if (!wishlist?.access_token) return;
    const publicUrl = `${WEB_BASE_URL}/w/${wishlist.access_token}`;
    Share.share({message: `Check out my wishlist: ${publicUrl}`, url: publicUrl});
  }, [wishlist?.access_token]);

  const handleAddItem = useCallback(() => {
    navigation.navigate('CreateItem', {wishlistId});
  }, [navigation, wishlistId]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: wishlist?.title ?? 'Wishlist',
      headerRight: () => (
        <View style={styles.headerRight}>
          {wishlist?.access_token ? (
            <Pressable
              android_ripple={null}
              onPress={handleShare}
              style={({pressed}) => pressed && styles.headerPressed}>
              <Text style={styles.headerBtn}>Share</Text>
            </Pressable>
          ) : null}
          <Pressable
            android_ripple={null}
            onPress={handleAddItem}
            style={({pressed}) => pressed && styles.headerPressed}>
            <Text style={styles.headerPlus}>+</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, wishlist, handleShare, handleAddItem]);

  const handleReservePress = useCallback(
    (item: Item) => {
      // STRICT OWNER GUARD — never allow owner to reserve
      if (isOwner) return;

      if (item.reserved_by_current_user) {
        Alert.alert('Unreserve', `Unreserve "${item.title}"?`, [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Unreserve',
            style: 'destructive',
            onPress: () =>
              unreserve.mutate(
                {itemId: item.id},
                {
                  onError: (e: any) => {
                    console.error('Unreserve failed', e);
                    Alert.alert('Error', e.message ?? 'Unreserve failed');
                  },
                },
              ),
          },
        ]);
      } else if (!item.reserved) {
        if (user) {
          reserve.mutate(
            {itemId: item.id, displayName: user.display_name},
            {
              onError: (e: any) => {
                console.error('Reserve failed', e);
                Alert.alert('Error', e.message ?? 'Reserve failed');
              },
            },
          );
        } else {
          setReserveModal({itemId: item.id});
        }
      }
    },
    [isOwner, user, reserve, unreserve],
  );

  const submitReserve = useCallback(() => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!reserveModal) return;
    reserve.mutate(
      {itemId: reserveModal.itemId, displayName: displayName.trim()},
      {
        onSuccess: () => {
          setReserveModal(null);
          setDisplayName('');
        },
        onError: (e: any) => {
          console.error('Reserve failed', e);
          Alert.alert('Error', e.message ?? 'Reserve failed');
        },
      },
    );
  }, [displayName, reserveModal, reserve]);

  const closeModal = useCallback(() => {
    setReserveModal(null);
    setDisplayName('');
  }, []);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const keyExtractor = useCallback((i: Item) => i.id, []);

  if (isLoading) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </GradientBackground>
    );
  }

  if (isError || !wishlist) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load wishlist</Text>
          <PrimaryButton title="Retry" onPress={handleRetry} />
        </View>
      </GradientBackground>
    );
  }

  const renderItem = ({item}: {item: Item}) => {
    const isReservedByMe = item.reserved_by_current_user;
    const isReservedByOther = item.reserved && !isReservedByMe;
    const statusColor = STATUS_COLORS[item.status] ?? DEFAULT_STATUS_COLOR;
    const badgeBg = statusColor + '20';

    // Owner must NEVER see reserve button
    const showReserveButton = item.status === 'active' && !isOwner;

    return (
      <Pressable
        android_ripple={null}
        style={({pressed}) => [styles.card, pressed && styles.pressedState]}
        onPress={() => navigation.navigate('ItemDetail', {wishlistId, itemId: item.id})}>
        {resolveImageUrl(item.image_url) ? (
          <Image
            source={{uri: resolveImageUrl(item.image_url)!}}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.cardImageFallback}>
            <Text style={styles.cardImageFallbackIcon}>🖼️</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={[styles.statusBadge, {backgroundColor: badgeBg}]}>
              <Text style={[styles.statusText, {color: statusColor}]}>
                {item.status}
              </Text>
            </View>
          </View>

          {item.price_cents != null && (
            <Text style={styles.price}>
              {(item.price_cents / 100).toLocaleString('en-US', {
                style: 'currency',
                currency: item.currency || 'USD',
              })}
            </Text>
          )}

          <AnimatedProgressBar item={item} />

          {showReserveButton && (
            <Pressable
              android_ripple={null}
              style={({pressed}) => [
                styles.reserveBtn,
                isReservedByMe && styles.reserveBtnActive,
                isReservedByOther && styles.reserveBtnDisabled,
                pressed && styles.pressedState,
              ]}
              onPress={() => handleReservePress(item)}
              disabled={isReservedByOther || reserve.isPending}>
              {reserve.isPending ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text
                  style={[
                    styles.reserveBtnText,
                    isReservedByMe && styles.reserveBtnTextActive,
                    isReservedByOther && styles.reserveBtnTextDisabled,
                  ]}>
                  {isReservedByMe
                    ? 'Reserved by you · Tap to unreserve'
                    : isReservedByOther
                    ? 'Already reserved'
                    : 'Reserve'}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <GradientBackground>
      <FlatList
        data={wishlist.items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {wishlist.description ? (
              <Text style={styles.description}>{wishlist.description}</Text>
            ) : null}
            {wishlist.items.length > 0 && <SummaryBlock items={wishlist.items} />}
          </>
        }
        ListFooterComponent={
          wishlist.items.length > 0 && wishlist.items.length <= 2 ? (
            <View style={styles.listFooter}>
              <Text style={styles.listFooterText}>Tap + to add more items</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyCenter}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIconPlus}>+</Text>
            </View>
            <Text style={styles.emptyText}>No items yet</Text>
            <Text style={styles.emptyHint}>Add your first item to get started</Text>
            <PrimaryButton title="+ Add your first item" onPress={handleAddItem} />
          </View>
        }
      />

      {wishlist.items.length > 0 && (
        <Pressable
          android_ripple={null}
          style={({pressed}) => [styles.fab, pressed && styles.fabPressed]}
          onPress={handleAddItem}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            style={styles.fabGradient}>
            <Text style={styles.fabText}>+</Text>
          </LinearGradient>
        </Pressable>
      )}

      <Modal
        visible={!!reserveModal}
        transparent
        animationType="slide"
        onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reserve Item</Text>
            <Text style={styles.modalLabel}>Your name</Text>
            <GlassInput
              placeholder="e.g. John"
              value={displayName}
              onChangeText={setDisplayName}
              autoFocus
              style={styles.modalInputSpacing}
            />
            <View style={styles.modalActions}>
              <Pressable
                android_ripple={null}
                style={({pressed}) => [styles.modalCancel, pressed && styles.pressedState]}
                onPress={closeModal}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                android_ripple={null}
                style={({pressed}) => [styles.modalConfirm, pressed && styles.pressedState]}
                onPress={submitReserve}
                disabled={reserve.isPending}>
                {reserve.isPending ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  list: {padding: spacing.lg, paddingTop: 100, paddingBottom: 100, flexGrow: 1},
  center: {flex: 1, justifyContent: 'center', alignItems: 'stretch', padding: spacing.xxxl},
  description: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  headerRight: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginRight: spacing.xs},
  headerBtn: {color: colors.accent, fontSize: 15},
  headerPlus: {color: colors.accent, fontSize: 24, lineHeight: 28},
  headerPressed: {opacity: 0.6},
  pressedState: {
    opacity: 0.88,
    transform: [{scale: 0.97}],
  },
  summaryBlock: {
    flexDirection: 'row',
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.white,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.light,
  },
  card: {
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.xxl,
    marginBottom: spacing.md,
    ...shadows.md,
    overflow: 'hidden',
  },
  cardImage: {width: '100%', height: 140, backgroundColor: colors.background.tertiary},
  cardImageFallback: {
    width: '100%',
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImageFallbackIcon: {
    fontSize: 32,
    opacity: 0.3,
  },
  cardBody: {padding: spacing.lg},
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  itemTitle: {fontSize: 16, fontWeight: '600' as const, color: colors.white, flex: 1, marginRight: spacing.sm},
  statusBadge: {borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 3},
  statusText: {fontSize: 11, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5},
  price: {fontSize: 14, color: colors.text.secondary, marginBottom: spacing.xs},
  progressSection: {marginBottom: spacing.md},
  progressTrack: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {height: 12, borderRadius: borderRadius.full, backgroundColor: colors.primary},
  progressLabel: {fontSize: 12, color: colors.text.tertiary},
  reserveBtn: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  reserveBtnActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  reserveBtnDisabled: {borderColor: colors.border.light},
  reserveBtnText: {color: colors.accent, fontWeight: '600' as const, fontSize: 14},
  reserveBtnTextActive: {color: colors.white},
  reserveBtnTextDisabled: {color: colors.text.tertiary},
  errorText: {fontSize: 16, color: colors.status.error, marginBottom: spacing.lg, textAlign: 'center'},
  emptyCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.lg,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.border.medium,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  emptyIconPlus: {
    fontSize: 28,
    color: colors.text.tertiary,
    lineHeight: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.white,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginBottom: spacing.xxl,
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.glass.border,
    padding: spacing.xxl,
    paddingBottom: 40,
  },
  modalTitle: {fontSize: 18, fontWeight: '700' as const, marginBottom: spacing.lg, color: colors.white},
  modalLabel: {fontSize: 13, color: colors.text.secondary, marginBottom: spacing.xs},
  modalInputSpacing: {marginBottom: spacing.lg},
  modalActions: {flexDirection: 'row', gap: spacing.md},
  modalCancel: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    borderRadius: 18,
    padding: spacing.md,
    alignItems: 'center',
  },
  modalCancelText: {color: colors.text.secondary, fontWeight: '600' as const},
  modalConfirm: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: spacing.md,
    alignItems: 'center',
  },
  modalConfirmText: {color: colors.white, fontWeight: '600' as const},
  listFooter: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  listFooterText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
});
