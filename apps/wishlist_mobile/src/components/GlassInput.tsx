import React from 'react';
import {TextInput, StyleSheet, TextInputProps} from 'react-native';
import {colors, borderRadius, spacing} from '../theme';

interface Props extends TextInputProps {
  // inherits all TextInput props
}

export default function GlassInput(props: Props) {
  return (
    <TextInput
      placeholderTextColor={colors.text.tertiary}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text.primary,
  },
});
