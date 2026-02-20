import React, {useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {listWishlists, deleteWishlist} from '../api/wishlists';
import {WEB_BASE_URL} from '../api/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import type {WishlistListItem} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Main'> & {
  onLogout: () => void;
};

export default function WishlistListScreen({navigation, onLogout}: Props) {
  const queryClient = useQueryClient();
  const {data, isLoading, isError, refetch} = useQuery<WishlistListItem[]>({
    queryKey: ['wishlists'],
    queryFn: listWishlists,
  });

  // Refetch on screen focus to keep counts and data fresh
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={onLogout} style={{marginRight: 4}}>
          <Text style={{color: '#6C63FF', fontSize: 15}}>Logout</Text>
        </TouchableOpacity>
      ),
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateWishlist')}
          style={{marginLeft: 4}}>
          <Text style={{color: '#6C63FF', fontSize: 24, lineHeight: 28}}>+</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, onLogout]);

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete', `Delete "${title}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWishlist(id);
            queryClient.invalidateQueries({queryKey: ['wishlists']});
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load wishlists</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderItem = ({item}: {item: WishlistListItem}) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('WishlistDetail', {wishlistId: item.id})}
      onLongPress={() => handleDelete(item.id, item.title)}>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.cardDesc} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
        <Text style={styles.cardMeta}>
          {item.item_count} item{item.item_count !== 1 ? 's' : ''}
          {item.deadline
            ? `  ·  Due ${new Date(item.deadline).toLocaleDateString()}`
            : ''}
        </Text>
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            const publicUrl = `${WEB_BASE_URL}/w/${item.access_token}`;
            Share.share({message: `Check out my wishlist: ${publicUrl}`, url: publicUrl});
          }}>
          <Text style={styles.shareText}>Share</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(i) => i.id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>No wishlists yet.</Text>
          <Text style={styles.emptyHint}>Tap + to create one.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {padding: 16, flexGrow: 1},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32},
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  cardContent: {flex: 1},
  cardTitle: {fontSize: 17, fontWeight: '600', color: '#1a1a1a'},
  cardDesc: {fontSize: 13, color: '#888', marginTop: 2},
  cardMeta: {fontSize: 12, color: '#aaa', marginTop: 6},
  shareBtn: {marginTop: 8, alignSelf: 'flex-start'},
  shareText: {fontSize: 13, color: '#6C63FF', fontWeight: '600'},
  chevron: {fontSize: 22, color: '#ccc', marginLeft: 8},
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
});
