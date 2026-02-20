import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import {useQueryClient} from '@tanstack/react-query';
import {createItem, scrapeUrl} from '../api/items';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateItem'>;

export default function CreateItemScreen({route, navigation}: Props) {
  const {wishlistId} = route.params;
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [priceCents, setPriceCents] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);

  const handleScrape = async () => {
    const trimmed = url.trim();
    if (!trimmed || !trimmed.startsWith('http')) return;
    setScraping(true);
    try {
      const result = await scrapeUrl(trimmed);
      if (result.title && !title) setTitle(result.title);
      if (result.image_url && !imageUrl) setImageUrl(result.image_url);
      if (result.price_cents != null && !priceCents) {
        setPriceCents((result.price_cents / 100).toFixed(2));
      }
      if (result.currency && currency === 'USD') {
        setCurrency(result.currency);
      }
    } catch {
      // Scrape failed silently — user can fill in manually
    } finally {
      setScraping(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    const parsedPrice = priceCents ? Math.round(parseFloat(priceCents) * 100) : null;
    if (priceCents && (isNaN(parsedPrice!) || parsedPrice! < 0)) {
      Alert.alert('Error', 'Invalid price');
      return;
    }
    setLoading(true);
    try {
      await createItem(wishlistId, {
        title: title.trim(),
        url: url.trim() || null,
        price_cents: parsedPrice,
        currency: currency.trim().toUpperCase() || 'USD',
        image_url: imageUrl.trim() || null,
      });
      queryClient.invalidateQueries({queryKey: ['wishlist', wishlistId]});
      queryClient.invalidateQueries({queryKey: ['wishlists']});
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{flex: 1}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>URL</Text>
        <View style={styles.urlRow}>
          <TextInput
            style={[styles.input, styles.urlInput]}
            placeholder="https://..."
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
            onBlur={handleScrape}
          />
          <TouchableOpacity
            style={styles.scrapeBtn}
            onPress={handleScrape}
            disabled={scraping || !url.trim()}>
            {scraping ? (
              <ActivityIndicator size="small" color="#6C63FF" />
            ) : (
              <Text style={styles.scrapeBtnText}>Autofill</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. AirPods Pro"
          value={title}
          onChangeText={setTitle}
          maxLength={500}
        />

        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.label}>Price</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={priceCents}
              onChangeText={setPriceCents}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.currencyBox}>
            <Text style={styles.label}>Currency</Text>
            <TextInput
              style={[styles.input, styles.currencyInput]}
              placeholder="USD"
              value={currency}
              onChangeText={setCurrency}
              maxLength={3}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <Text style={styles.label}>Image URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://example.com/image.jpg"
          value={imageUrl}
          onChangeText={setImageUrl}
          autoCapitalize="none"
          keyboardType="url"
        />
        {imageUrl ? (
          <Image
            source={{uri: imageUrl}}
            style={styles.imagePreview}
            resizeMode="cover"
          />
        ) : null}

        <TouchableOpacity
          style={styles.button}
          onPress={handleCreate}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Add Item</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {padding: 24, backgroundColor: '#fff', flexGrow: 1},
  label: {fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 16},
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  urlRow: {flexDirection: 'row', gap: 8},
  urlInput: {flex: 1},
  scrapeBtn: {
    borderWidth: 1.5,
    borderColor: '#6C63FF',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrapeBtnText: {color: '#6C63FF', fontWeight: '600', fontSize: 14},
  row: {flexDirection: 'row', gap: 12},
  flex: {flex: 1},
  currencyBox: {width: 90},
  currencyInput: {textAlign: 'center'},
  imagePreview: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginTop: 10,
    backgroundColor: '#f3f4f6',
  },
  button: {
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonText: {color: '#fff', fontSize: 16, fontWeight: '600'},
});
