import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {colors, borderRadius, spacing} from '../theme';

interface Props {
  label: string;
  color?: string;
  style?: ViewStyle;
}

export default function TagChip({label, color = colors.accent, style}: Props) {
  return (
    <View style={[styles.chip, {backgroundColor: color + '20'}, style]}>
      <Text style={[styles.text, {color}]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
