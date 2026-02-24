import React from 'react';
import {Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, borderRadius, shadows, spacing} from '../theme';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function PrimaryButton({title, onPress, loading, disabled, style}: Props) {
  return (
    <Pressable
      android_ripple={null}
      onPress={onPress}
      disabled={disabled || loading}
      style={({pressed}) => [pressed && styles.pressed, style]}>
      <LinearGradient
        colors={[colors.primary, colors.primaryLight]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={styles.gradient}>
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },
  text: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pressed: {
    opacity: 0.88,
    transform: [{scale: 0.97}],
  },
});
