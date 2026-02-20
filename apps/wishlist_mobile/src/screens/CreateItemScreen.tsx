import React, {useCallback, useState} from 'react';
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
import {launchImageLibrary} from 'react-native-image-picker';
import {useQueryClient} from '@tanstack/react-query';
import {createItem, scrapeUrl, uploadImage} from '../api/items';
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
  const [uploading, setUploading] = useState(false);

  const handleScrape = useCallback(async () => {
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
    } catch (e) {
      console.error('Scrape failed', e);
      Alert.alert('Autofill failed', 'Could not extract info from URL. You can fill in fields manually.');
    } finally {
      setScraping(false);
    }
  }, [url, title, imageUrl, priceCents, currency]);

  const handlePickImage = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });
      if (result.didCancel || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;

      setUploading(true);
      try {
        const uploaded = await uploadImage(
          asset.uri,
          asset.fileName ?? 'image.jpg',
          asset.type ?? 'image/jpeg',
        );
        setImageUrl(uploaded.url);
      } catch (uploadErr: any) {
        console.error('Image upload failed', uploadErr);
        // Fallback: use local URI as preview (won't persist on backend without upload endpoint)
        setImageUrl(asset.uri);
        Alert.alert('Upload unavailable', 'Image selected locally. Upload endpoint not configured on backend.');
      } finally {
        setUploading(false);
      }
    } catch (e) {
      console.error('Image picker failed', e);
      Alert.alert('Error', 'Failed to open image picker');
    }
  }, []);

  const handleCreate = useCallback(async () => {
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
      console.error('Create item failed', e);
      Alert.alert('Error', e.message ?? 'Failed to create item');
    } finally {
      setLoading(false);
    }
  }, [title, url, priceCents, currency, imageUrl, wishlistId, queryClient, navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.flex1}
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

        <Text style={styles.label}>Image</Text>
        <View style={styles.imageRow}>
          <TextInput
            style={[styles.input, styles.urlInput]}
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            onChangeText={setImageUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
          <TouchableOpacity
            style={styles.pickBtn}
            onPress={handlePickImage}
            disabled={uploading}>
            {uploading ? (
              <ActivityIndicator size="small" color="#6C63FF" />
            ) : (
              <Text style={styles.pickBtnText}>Gallery</Text>
            )}
          </TouchableOpacity>
        </View>
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
          disabled={loading || uploading}>
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
  flex1: {flex: 1},
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
  imageRow: {flexDirection: 'row', gap: 8},
  pickBtn: {
    borderWidth: 1.5,
    borderColor: '#6C63FF',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickBtnText: {color: '#6C63FF', fontWeight: '600', fontSize: 14},
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
