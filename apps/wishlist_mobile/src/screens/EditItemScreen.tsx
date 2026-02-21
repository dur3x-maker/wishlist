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
import {updateItem, uploadImage} from '../api/items';
import {useWishlistDetail} from '../hooks/useWishlistDetail';
import {resolveImageUrl} from '../utils/imageUrl';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import type {Item} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditItem'>;

export default function EditItemScreen({route, navigation}: Props) {
  const {wishlistId, itemId} = route.params;
  const queryClient = useQueryClient();
  const {data: wishlist} = useWishlistDetail(wishlistId);
  const item = wishlist?.items.find((i: Item) => i.id === itemId);

  const [title, setTitle] = useState(item?.title ?? '');
  const [url, setUrl] = useState(item?.url ?? '');
  const [priceCents, setPriceCents] = useState(
    item?.price_cents != null ? (item.price_cents / 100).toFixed(2) : '',
  );
  const [currency, setCurrency] = useState(item?.currency ?? 'USD');
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? '');
  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] = useState(false);

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
        const {url} = await uploadImage(
          asset.uri,
          asset.fileName || 'photo.jpg',
          asset.type || 'image/jpeg',
        );
        setImageUrl(url);
      } catch (uploadErr: any) {
        console.error('Image upload failed', uploadErr);
        Alert.alert('Upload failed', 'Could not upload image. You can paste a URL manually.');
      } finally {
        setUploading(false);
      }
    } catch (e) {
      console.error('Image picker failed', e);
      Alert.alert('Error', 'Failed to open image picker');
    }
  }, []);

  const handleSave = useCallback(async () => {
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
      await updateItem(wishlistId, itemId, {
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
      console.error('Update item failed', e);
      Alert.alert('Error', e.message ?? 'Failed to update item');
    } finally {
      setLoading(false);
    }
  }, [title, url, priceCents, currency, imageUrl, wishlistId, itemId, queryClient, navigation]);

  if (!item) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Item not found</Text>
      </View>
    );
  }

  const resolvedImage = resolveImageUrl(imageUrl);

  return (
    <KeyboardAvoidingView
      style={styles.flex1}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://..."
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          keyboardType="url"
        />

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
            onPress={handlePickImage}>
            <Text style={styles.pickBtnText}>Gallery</Text>
          </TouchableOpacity>
        </View>
        {resolvedImage ? (
          <Image
            source={{uri: resolvedImage}}
            style={styles.imagePreview}
            resizeMode="cover"
          />
        ) : null}

        <TouchableOpacity
          style={styles.button}
          onPress={handleSave}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex1: {flex: 1},
  container: {padding: 24, backgroundColor: '#fff', flexGrow: 1},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32},
  errorText: {fontSize: 16, color: '#e53e3e'},
  label: {fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 16},
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  row: {flexDirection: 'row', gap: 12},
  flex: {flex: 1},
  currencyBox: {width: 90},
  currencyInput: {textAlign: 'center'},
  imageRow: {flexDirection: 'row', gap: 8},
  urlInput: {flex: 1},
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
