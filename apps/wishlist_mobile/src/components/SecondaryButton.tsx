import React from 'react';
import {Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle} from 'react-native';
import {colors, borderRadius, spacing} from '../theme';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function SecondaryButton({title, onPress, loading, disabled, style}: Props) {
  return (
    <Pressable
      android_ripple={null}
      onPress={onPress}
      disabled={disabled || loading}
      style={({pressed}) => [styles.button, pressed && styles.pressed, style]}>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(196,181,253,0.4)',
    backgroundColor: 'rgba(124,58,237,0.08)',
  },
  text: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pressed: {
    opacity: 0.88,
    transform: [{scale: 0.97}],
  },
});
