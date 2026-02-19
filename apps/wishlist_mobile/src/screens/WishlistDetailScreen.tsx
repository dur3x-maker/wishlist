import React, {useState} from 'react';
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
} from 'react-native';
import {useWishlistDetail} from '../hooks/useWishlistDetail';
import {useReserve} from '../hooks/useReserve';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import type {Item} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'WishlistDetail'>;

export default function WishlistDetailScreen({route, navigation}: Props) {
  const {wishlistId} = route.params;
  const {data: wishlist, isLoading, isError, refetch} = useWishlistDetail(wishlistId);
  const {reserve, unreserve} = useReserve(
    wishlistId,
    wishlist?.access_token ?? '',
  );

  const [reserveModal, setReserveModal] = useState<{itemId: string} | null>(null);
  const [displayName, setDisplayName] = useState('');

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: wishlist?.title ?? 'Wishlist',
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateItem', {wishlistId})}
          style={{marginRight: 4}}>
          <Text style={{color: '#6C63FF', fontSize: 24, lineHeight: 28}}>+</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, wishlist, wishlistId]);

  const handleReservePress = (item: Item) => {
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
                onError: (e: any) => Alert.alert('Error', e.message),
              },
            ),
        },
      ]);
    } else if (!item.reserved) {
      setReserveModal({itemId: item.id});
    }
  };

  const submitReserve = () => {
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
        onError: (e: any) => Alert.alert('Error', e.message),
      },
    );
  };

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
        <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderItem = ({item}: {item: Item}) => {
    const isReservedByMe = item.reserved_by_current_user;
    const isReservedByOther = item.reserved && !isReservedByMe;
    const statusColor =
      item.status === 'active'
        ? '#22c55e'
        : item.status === 'funded'
        ? '#6C63FF'
        : item.status === 'expired'
        ? '#f59e0b'
        : '#9ca3af';

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={[styles.statusBadge, {backgroundColor: statusColor + '20'}]}>
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
            {item.total_contributed > 0 &&
              ` · ${(item.total_contributed / 100).toFixed(0)} funded`}
          </Text>
        )}

        {item.status === 'active' && (
          <TouchableOpacity
            style={[
              styles.reserveBtn,
              isReservedByMe && styles.reserveBtnActive,
              isReservedByOther && styles.reserveBtnDisabled,
            ]}
            onPress={() => handleReservePress(item)}
            disabled={isReservedByOther}>
            <Text
              style={[
                styles.reserveBtnText,
                isReservedByOther && {color: '#9ca3af'},
              ]}>
              {isReservedByMe
                ? 'Reserved by you · Tap to unreserve'
                : isReservedByOther
                ? 'Already reserved'
                : 'Reserve'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <>
      <FlatList
        data={wishlist.items}
        keyExtractor={(i) => i.id}
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
        onRequestClose={() => setReserveModal(null)}>
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
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setReserveModal(null);
                  setDisplayName('');
                }}>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  itemTitle: {fontSize: 16, fontWeight: '600', color: '#1a1a1a', flex: 1, marginRight: 8},
  statusBadge: {borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3},
  statusText: {fontSize: 11, fontWeight: '600', textTransform: 'uppercase'},
  price: {fontSize: 14, color: '#555', marginBottom: 10},
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
