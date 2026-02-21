import React, {useState, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Share,
  Image,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useWishlistDetail} from '../hooks/useWishlistDetail';
import {useReserve} from '../hooks/useReserve';
import {useAuthContext} from '../hooks/AuthContext';
import {WEB_BASE_URL} from '../api/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import type {Item} from '../types';
import {resolveImageUrl} from '../utils/imageUrl';

type Props = NativeStackScreenProps<RootStackParamList, 'WishlistDetail'>;

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  funded: '#6C63FF',
  expired: '#f59e0b',
};
const DEFAULT_STATUS_COLOR = '#9ca3af';

function ProgressBar({item}: {item: Item}) {
  if (item.price_cents == null || item.price_cents <= 0) {
    return null;
  }
  const progress = Math.min(100, Math.round((item.total_contributed / item.price_cents) * 100));
  const funded = (item.total_contributed / 100).toFixed(2);
  const total = (item.price_cents / 100).toFixed(2);
  const cur = item.currency || 'USD';
  return (
    <View style={styles.progressSection}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, {width: `${progress}%`}]} />
      </View>
      <Text style={styles.progressLabel}>
        {cur} {funded} of {cur} {total} ({progress}%)
      </Text>
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
            <TouchableOpacity onPress={handleShare}>
              <Text style={styles.headerBtn}>Share</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={handleAddItem}>
            <Text style={styles.headerPlus}>+</Text>
          </TouchableOpacity>
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (isError || !wishlist) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load wishlist</Text>
        <TouchableOpacity onPress={handleRetry} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
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
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ItemDetail', {wishlistId, itemId: item.id})}>
        {resolveImageUrl(item.image_url) ? (
          <Image
            source={{uri: resolveImageUrl(item.image_url)!}}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : null}
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

          <ProgressBar item={item} />

          {showReserveButton && (
            <TouchableOpacity
              style={[
                styles.reserveBtn,
                isReservedByMe && styles.reserveBtnActive,
                isReservedByOther && styles.reserveBtnDisabled,
              ]}
              onPress={() => handleReservePress(item)}
              disabled={isReservedByOther || reserve.isPending}>
              {reserve.isPending ? (
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
                    : 'Reserve'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <FlatList
        data={wishlist.items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          wishlist.description ? (
            <Text style={styles.description}>{wishlist.description}</Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No items yet.</Text>
            <Text style={styles.emptyHint}>Tap + to add one.</Text>
          </View>
        }
      />

      <Modal
        visible={!!reserveModal}
        transparent
        animationType="slide"
        onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reserve Item</Text>
            <Text style={styles.modalLabel}>Your name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. John"
              value={displayName}
              onChangeText={setDisplayName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={closeModal}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={submitReserve}
                disabled={reserve.isPending}>
                {reserve.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  list: {padding: 16, flexGrow: 1},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32},
  description: {fontSize: 14, color: '#666', marginBottom: 16},
  headerRight: {flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 4},
  headerBtn: {color: '#6C63FF', fontSize: 15},
  headerPlus: {color: '#6C63FF', fontSize: 24, lineHeight: 28},
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
    overflow: 'hidden',
  },
  cardImage: {width: '100%', height: 140, backgroundColor: '#f3f4f6'},
  cardBody: {padding: 16},
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  itemTitle: {fontSize: 16, fontWeight: '600', color: '#1a1a1a', flex: 1, marginRight: 8},
  statusBadge: {borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3},
  statusText: {fontSize: 11, fontWeight: '600', textTransform: 'uppercase'},
  price: {fontSize: 14, color: '#555', marginBottom: 4},
  progressSection: {marginBottom: 10},
  progressTrack: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {height: 6, borderRadius: 3, backgroundColor: '#6C63FF'},
  progressLabel: {fontSize: 12, color: '#888'},
  reserveBtn: {
    borderWidth: 1.5,
    borderColor: '#6C63FF',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  reserveBtnActive: {backgroundColor: '#6C63FF'},
  reserveBtnDisabled: {borderColor: '#e5e7eb'},
  reserveBtnText: {color: '#6C63FF', fontWeight: '600', fontSize: 14},
  reserveBtnTextActive: {color: '#fff'},
  reserveBtnTextDisabled: {color: '#9ca3af'},
  errorText: {fontSize: 16, color: '#e53e3e', marginBottom: 12},
  retryBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {color: '#fff', fontWeight: '600'},
  emptyText: {fontSize: 18, color: '#555', fontWeight: '600'},
  emptyHint: {fontSize: 14, color: '#aaa', marginTop: 6},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {fontSize: 18, fontWeight: '700', marginBottom: 16, color: '#1a1a1a'},
  modalLabel: {fontSize: 13, color: '#666', marginBottom: 6},
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fafafa',
    marginBottom: 16,
  },
  modalActions: {flexDirection: 'row', gap: 12},
  modalCancel: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  modalCancelText: {color: '#555', fontWeight: '600'},
  modalConfirm: {
    flex: 1,
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  modalConfirmText: {color: '#fff', fontWeight: '600'},
});
