import React, {useState} from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useQueryClient} from '@tanstack/react-query';
import {createWishlist} from '../api/wishlists';
import {colors, spacing, borderRadius} from '../theme';
import {formatDeadlineDate} from '../utils/countdown';
import {GradientBackground, GlassInput, PrimaryButton} from '../components';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateWishlist'>;

export default function CreateWishlistScreen({navigation}: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    setLoading(true);
    try {
      const deadlineISO = deadline ? deadline.toISOString() : null;
      await createWishlist({
        title: title.trim(),
        description: description.trim(),
        is_public: isPublic,
        deadline: deadlineISO,
      });
      queryClient.invalidateQueries({queryKey: ['wishlists']});
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to create wishlist');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDeadline(selectedDate);
    }
  };

  const getMinDate = () => {
    const d = new Date(Date.now() + 60000);
    return d;
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.label}>Title *</Text>
          <GlassInput
            placeholder="e.g. Birthday 2025"
            value={title}
            onChangeText={setTitle}
            maxLength={255}
          />

          <Text style={styles.label}>Description</Text>
          <GlassInput
            placeholder="Optional description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={styles.multiline}
          />

          <View style={styles.row}>
            <Text style={styles.label}>Public wishlist</Text>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{true: colors.primary, false: 'rgba(255,255,255,0.12)'}}
              thumbColor={colors.white}
            />
          </View>

          <Text style={styles.label}>Deadline (optional)</Text>
          <Pressable
            android_ripple={null}
            style={({pressed}) => [styles.dateButton, pressed && styles.pressedState]}
            onPress={() => setShowDatePicker(true)}>
            <Text style={deadline ? styles.dateText : styles.datePlaceholder}>
              {deadline ? formatDeadlineDate(deadline.toISOString()) : 'Select deadline'}
            </Text>
          </Pressable>
          {deadline && (
            <Pressable
              android_ripple={null}
              style={({pressed}) => [styles.clearButton, pressed && {opacity: 0.6}]}
              onPress={() => setDeadline(null)}>
              <Text style={styles.clearButtonText}>Clear deadline</Text>
            </Pressable>
          )}
          <Text style={styles.hint}>
            Items will expire after this date. Max 3 years from now.
          </Text>

          {showDatePicker && (
            <DateTimePicker
              value={deadline || getMinDate()}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={getMinDate()}
            />
          )}

          <PrimaryButton
            title="Create Wishlist"
            onPress={handleCreate}
            loading={loading}
            disabled={loading}
            style={styles.createBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flex1: {flex: 1},
  container: {padding: spacing.xxl, paddingTop: 100, flexGrow: 1},
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    marginTop: spacing.lg,
  },
  multiline: {height: 90, textAlignVertical: 'top'},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dateText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  datePlaceholder: {
    fontSize: 16,
    color: colors.text.tertiary,
  },
  clearButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600' as const,
  },
  hint: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  createBtn: {
    marginTop: spacing.xxxl,
  },
  pressedState: {
    opacity: 0.88,
    transform: [{scale: 0.97}],
  },
});
