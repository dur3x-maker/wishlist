import React from 'react';
import {Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, spacing} from '../theme';

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
      style={({pressed}) => [style, pressed && styles.pressed]}>
      <LinearGradient
        colors={[colors.primary, colors.primaryLight]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={styles.gradient}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradient: {
    height: 58,
    borderRadius: 22,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.92,
    transform: [{scale: 0.98}],
  },
});
