import React, {useCallback, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Linking,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useWishlistDetail} from '../hooks/useWishlistDetail';
import {useReserve} from '../hooks/useReserve';
import {useAuthContext} from '../hooks/AuthContext';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import type {Item} from '../types';
import {resolveImageUrl} from '../utils/imageUrl';

type Props = NativeStackScreenProps<RootStackParamList, 'ItemDetail'>;

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  funded: '#6C63FF',
  expired: '#f59e0b',
};
const DEFAULT_STATUS_COLOR = '#9ca3af';

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
      <View style={styles.center}>
        <Text style={styles.errorText}>Item not found</Text>
      </View>
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
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
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
          <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
            <Text style={styles.editBtnText}>Edit Item</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.url ? (
        <TouchableOpacity style={styles.urlRow} onPress={handleOpenUrl}>
          <Text style={styles.urlText} numberOfLines={1}>
            {item.url}
          </Text>
        </TouchableOpacity>
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

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {width: `${progress}%`, backgroundColor: statusColor},
              ]}
            />
          </View>
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
          <TouchableOpacity
            style={[
              styles.reserveBtn,
              isReservedByMe && styles.reserveBtnActive,
              isReservedByOther && styles.reserveBtnDisabled,
            ]}
            onPress={handleReserve}
            disabled={isReservedByOther || reserve.isPending || unreserve.isPending}>
            {reserve.isPending || unreserve.isPending ? (
              <ActivityIndicator size="small" color="#6C63FF" />
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
          </TouchableOpacity>
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
  );
}

const styles = StyleSheet.create({
  scroll: {flex: 1, backgroundColor: '#fff'},
  container: {paddingBottom: 40},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32},
  errorText: {fontSize: 16, color: '#e53e3e'},
  image: {width: '100%', height: 240, backgroundColor: '#f3f4f6'},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 8,
  },
  title: {fontSize: 20, fontWeight: '700', color: '#1a1a1a', flex: 1, marginRight: 8},
  statusBadge: {borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3},
  statusText: {fontSize: 11, fontWeight: '600', textTransform: 'uppercase'},
  urlRow: {paddingHorizontal: 16, marginBottom: 12},
  urlText: {fontSize: 14, color: '#6C63FF'},
  priceSection: {paddingHorizontal: 16, marginBottom: 16},
  priceLabel: {fontSize: 12, color: '#888', marginBottom: 2},
  priceValue: {fontSize: 18, fontWeight: '600', color: '#1a1a1a'},
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {height: 6, borderRadius: 3},
  progressText: {fontSize: 12, color: '#888', marginTop: 4},
  reservedBanner: {
    marginHorizontal: 16,
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  reservedText: {color: '#16a34a', fontWeight: '600', fontSize: 14},
  reserveSection: {paddingHorizontal: 16, marginBottom: 16},
  reserveBtn: {
    borderWidth: 1.5,
    borderColor: '#6C63FF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reserveBtnActive: {backgroundColor: '#6C63FF'},
  reserveBtnDisabled: {borderColor: '#e5e7eb'},
  reserveBtnText: {color: '#6C63FF', fontWeight: '600', fontSize: 15},
  reserveBtnTextActive: {color: '#fff'},
  reserveBtnTextDisabled: {color: '#9ca3af'},
  section: {paddingHorizontal: 16, marginBottom: 16},
  sectionTitle: {fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8},
  contributionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  contributorName: {fontSize: 14, color: '#333'},
  contributionAmount: {fontSize: 14, color: '#555', fontWeight: '500'},
  editSection: {paddingHorizontal: 16, marginBottom: 8},
  editBtn: {
    borderWidth: 1.5,
    borderColor: '#6C63FF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  editBtnText: {color: '#6C63FF', fontWeight: '600', fontSize: 15},
});
