import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Linking,
  TouchableOpacity,
} from 'react-native';
import {useQueryClient} from '@tanstack/react-query';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import type {Wishlist, Item} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ItemDetail'>;

export default function ItemDetailScreen({route}: Props) {
  const {wishlistId, itemId} = route.params;
  const queryClient = useQueryClient();
  const wishlist = queryClient.getQueryData<Wishlist>(['wishlist', wishlistId]);
  const item = wishlist?.items.find((i: Item) => i.id === itemId);

  if (!item) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Item not found</Text>
      </View>
    );
  }

  const statusColor =
    item.status === 'active'
      ? '#22c55e'
      : item.status === 'funded'
      ? '#6C63FF'
      : item.status === 'expired'
      ? '#f59e0b'
      : '#9ca3af';

  const progress =
    item.price_cents && item.price_cents > 0
      ? Math.min(100, Math.round((item.total_contributed / item.price_cents) * 100))
      : 0;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {item.image_url ? (
        <Image source={{uri: item.image_url}} style={styles.image} />
      ) : null}

      <View style={styles.header}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={[styles.statusBadge, {backgroundColor: statusColor + '20'}]}>
          <Text style={[styles.statusText, {color: statusColor}]}>
            {item.status}
          </Text>
        </View>
      </View>

      {item.url ? (
        <TouchableOpacity
          style={styles.urlRow}
          onPress={() => Linking.openURL(item.url!)}>
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

          {item.total_contributed > 0 && (
            <>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {width: `${progress}%`, backgroundColor: statusColor},
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {(item.total_contributed / 100).toFixed(2)} {item.currency || 'USD'} funded ({progress}%)
              </Text>
            </>
          )}
        </View>
      )}

      {item.reserved && (
        <View style={styles.reservedBanner}>
          <Text style={styles.reservedText}>
            {item.reserved_by_current_user
              ? 'Reserved by you'
              : 'Reserved'}
          </Text>
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
});
