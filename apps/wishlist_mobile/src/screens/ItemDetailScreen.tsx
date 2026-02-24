import React, {useCallback, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Linking,
  Pressable,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useWishlistDetail} from '../hooks/useWishlistDetail';
import {useReserve} from '../hooks/useReserve';
import {useAuthContext} from '../hooks/AuthContext';
import {colors, spacing, borderRadius} from '../theme';
import {GradientBackground, SecondaryButton} from '../components';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import type {Item} from '../types';
import {resolveImageUrl} from '../utils/imageUrl';

type Props = NativeStackScreenProps<RootStackParamList, 'ItemDetail'>;

const STATUS_COLORS: Record<string, string> = {
  active: colors.status.success,
  funded: colors.accent,
  expired: colors.status.warning,
};
const DEFAULT_STATUS_COLOR = colors.text.tertiary;

function AnimatedProgress({progress}: {progress: number}) {
  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [anim, progress]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressBar}>
      <Animated.View style={[styles.progressFill, {width}]} />
    </View>
  );
}

export default function ItemDetailScreen({route, navigation}: Props) {
  const {wishlistId, itemId} = route.params;
  const {user} = useAuthContext();
  const {data: wishlist, refetch} = useWishlistDetail(wishlistId);
  const item = wishlist?.items.find((i: Item) => i.id === itemId);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );
  const {reserve, unreserve} = useReserve(
    wishlistId,
    wishlist?.access_token ?? '',
  );

  const isOwner = useMemo(
    () => !!user && !!wishlist && wishlist.owner_user_id === user.id,
    [user, wishlist],
  );

  const handleEdit = useCallback(() => {
    navigation.navigate('EditItem', {wishlistId, itemId});
  }, [navigation, wishlistId, itemId]);

  const handleOpenUrl = useCallback(() => {
    if (item?.url) {
      Linking.openURL(item.url).catch((e) => {
        console.error('Failed to open URL', e);
        Alert.alert('Error', 'Could not open URL');
      });
    }
  }, [item?.url]);

  const handleReserve = useCallback(() => {
    if (!item || isOwner) return;

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
    } else if (!item.reserved && user) {
      reserve.mutate(
        {itemId: item.id, displayName: user.display_name},
        {
          onError: (e: any) => {
            console.error('Reserve failed', e);
            Alert.alert('Error', e.message ?? 'Reserve failed');
          },
        },
      );
    }
  }, [item, isOwner, user, reserve, unreserve]);

  if (!item) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          <Text style={styles.errorText}>Item not found</Text>
        </View>
      </GradientBackground>
    );
  }

  const statusColor = STATUS_COLORS[item.status] ?? DEFAULT_STATUS_COLOR;
  const badgeBg = statusColor + '20';

  const progress =
    item.price_cents && item.price_cents > 0
      ? Math.min(100, Math.round((item.total_contributed / item.price_cents) * 100))
      : 0;

  const showReserveButton = item.status === 'active' && !isOwner;
  const isReservedByMe = item.reserved_by_current_user;
  const isReservedByOther = item.reserved && !isReservedByMe;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.container}>
        {resolveImageUrl(item.image_url) ? (
          <Image source={{uri: resolveImageUrl(item.image_url)!}} style={styles.image} resizeMode="cover" />
        ) : null}

        <View style={styles.header}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={[styles.statusBadge, {backgroundColor: badgeBg}]}>
            <Text style={[styles.statusText, {color: statusColor}]}>
              {item.status}
            </Text>
          </View>
        </View>

        {isOwner && (
          <View style={styles.editSection}>
            <SecondaryButton title="Edit Item" onPress={handleEdit} />
          </View>
        )}

        {item.url ? (
          <Pressable
            android_ripple={null}
            style={({pressed}) => [styles.urlRow, pressed && {opacity: 0.6}]}
            onPress={handleOpenUrl}>
            <Text style={styles.urlText} numberOfLines={1}>
              {item.url}
            </Text>
          </Pressable>
        ) : null}

        {item.price_cents != null && item.price_cents > 0 && (
          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Price</Text>
            <Text style={styles.priceValue}>
              {(item.price_cents / 100).toLocaleString('en-US', {
                style: 'currency',
                currency: item.currency || 'USD',
              })}
            </Text>

            <AnimatedProgress progress={progress} />
            <Text style={styles.progressText}>
              {item.currency || 'USD'} {(item.total_contributed / 100).toFixed(2)} funded of{' '}
              {item.currency || 'USD'} {(item.price_cents / 100).toFixed(2)} ({progress}%)
            </Text>
          </View>
        )}

        {item.reserved && (
          <View style={styles.reservedBanner}>
            <Text style={styles.reservedText}>
              {isReservedByMe ? 'Reserved by you' : 'Reserved'}
            </Text>
          </View>
        )}

        {showReserveButton && (
          <View style={styles.reserveSection}>
            <Pressable
              android_ripple={null}
              style={({pressed}) => [
                styles.reserveBtn,
                isReservedByMe && styles.reserveBtnActive,
                isReservedByOther && styles.reserveBtnDisabled,
                pressed && styles.pressedState,
              ]}
              onPress={handleReserve}
              disabled={isReservedByOther || reserve.isPending || unreserve.isPending}>
              {reserve.isPending || unreserve.isPending ? (
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
                    : 'Reserve this item'}
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {item.contributions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contributions</Text>
            {item.contributions.map((c) => (
              <View key={c.id} style={styles.contributionRow}>
                <Text style={styles.contributorName}>{c.contributor_display_name}</Text>
                <Text style={styles.contributionAmount}>
                  {(c.amount_cents / 100).toFixed(2)} {item.currency || 'USD'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {paddingBottom: 40, paddingTop: 100},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl},
  errorText: {fontSize: 16, color: colors.status.error},
  image: {height: 240, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: borderRadius.xl, marginHorizontal: spacing.lg, marginBottom: spacing.md, overflow: 'hidden'},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {fontSize: 22, fontWeight: '700' as const, color: colors.white, flex: 1, marginRight: spacing.sm},
  statusBadge: {borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 3},
  statusText: {fontSize: 11, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5},
  pressedState: {
    opacity: 0.88,
    transform: [{scale: 0.97}],
  },
  urlRow: {paddingHorizontal: spacing.lg, marginBottom: spacing.md},
  urlText: {fontSize: 14, color: colors.accent},
  priceSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
  },
  priceLabel: {fontSize: 12, color: colors.text.tertiary, marginBottom: 2},
  priceValue: {fontSize: 22, fontWeight: '700' as const, color: colors.white},
  progressBar: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {height: 12, borderRadius: borderRadius.full, backgroundColor: colors.primary},
  progressText: {fontSize: 12, color: colors.text.tertiary, marginTop: spacing.xs},
  reservedBanner: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.status.success + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  reservedText: {color: colors.status.success, fontWeight: '600' as const, fontSize: 14},
  reserveSection: {paddingHorizontal: spacing.lg, marginBottom: spacing.lg},
  reserveBtn: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 18,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  reserveBtnActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  reserveBtnDisabled: {borderColor: colors.border.light},
  reserveBtnText: {color: colors.accent, fontWeight: '600' as const, fontSize: 15},
  reserveBtnTextActive: {color: colors.white},
  reserveBtnTextDisabled: {color: colors.text.tertiary},
  section: {paddingHorizontal: spacing.lg, marginBottom: spacing.lg},
  sectionTitle: {fontSize: 14, fontWeight: '600' as const, color: colors.text.secondary, marginBottom: spacing.sm},
  contributionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  contributorName: {fontSize: 14, color: colors.white},
  contributionAmount: {fontSize: 14, color: colors.text.secondary, fontWeight: '500' as const},
  editSection: {paddingHorizontal: spacing.lg, marginBottom: spacing.md},
});
