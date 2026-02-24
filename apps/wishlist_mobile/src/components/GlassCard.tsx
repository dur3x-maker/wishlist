import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {colors, borderRadius, shadows} from '../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

export default function GlassCard({children, style}: Props) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.xxl,
    ...shadows.md,
  },
});
