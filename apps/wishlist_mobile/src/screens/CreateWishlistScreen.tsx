import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useQueryClient} from '@tanstack/react-query';
import {createWishlist} from '../api/wishlists';
import {colors, spacing, typography, borderRadius} from '../theme';
import {formatDeadlineDate} from '../utils/countdown';
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
    <KeyboardAvoidingView
      style={{flex: 1}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Birthday 2025"
          value={title}
          onChangeText={setTitle}
          maxLength={255}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Optional description"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <View style={styles.row}>
          <Text style={styles.label}>Public wishlist</Text>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{true: colors.primary}}
          />
        </View>

        <Text style={styles.label}>Deadline (optional)</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}>
          <Text style={deadline ? styles.dateText : styles.datePlaceholder}>
            {deadline ? formatDeadlineDate(deadline.toISOString()) : 'Select deadline'}
          </Text>
        </TouchableOpacity>
        {deadline && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setDeadline(null)}>
            <Text style={styles.clearButtonText}>Clear deadline</Text>
          </TouchableOpacity>
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

        <TouchableOpacity
          style={styles.button}
          onPress={handleCreate}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Wishlist</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {padding: spacing.xxl, backgroundColor: colors.white, flexGrow: 1},
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    marginTop: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    backgroundColor: colors.background.secondary,
    color: colors.text.primary,
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
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
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
    color: colors.primary,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xxxl,
  },
  buttonText: {color: colors.white, fontSize: 16, fontWeight: '600'},
});
