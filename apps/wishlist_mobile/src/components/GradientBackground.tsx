import React from 'react';
import {StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors} from '../theme';

interface Props {
  children: React.ReactNode;
  style?: any;
}

export default function GradientBackground({children, style}: Props) {
  return (
    <LinearGradient
      colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
      style={[styles.container, style]}>
      {/* Subtle radial glow overlay */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(124,58,237,0.12)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -40,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(168,85,247,0.08)',
  },
});
