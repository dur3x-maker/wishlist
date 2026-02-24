import React from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import {colors, spacing, typography, shadows, borderRadius} from '../theme';

export default function LandingScreen({navigation}) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            Wishlist
          </Text>
          <Text style={styles.heroSubtitle}>
            Share your wishes,{'\n'}
            <Text style={styles.heroAccent}>surprise</Text> your friends
          </Text>
          <Text style={styles.heroBody}>
            Create wishlists, share them with loved ones, and make gift-giving effortless.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({pressed}) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => navigation.navigate('Register')}>
            <Text style={styles.primaryButtonText}>Get started free</Text>
          </Pressable>

          <Pressable
            style={({pressed}) => [
              styles.secondaryButton,
              pressed && styles.secondaryPressed,
            ]}
            onPress={() => navigation.navigate('Login')}>
            <Text style={styles.secondaryButtonText}>Log in</Text>
          </Pressable>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>Easy creation</Text>
          </View>
          <View style={styles.feature}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>Share with anyone</Text>
          </View>
          <View style={styles.feature}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>Track progress</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 56,
  },
  heroTitle: {
    fontSize: 52,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: spacing.lg,
  },
  heroSubtitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: spacing.lg,
  },
  heroAccent: {
    color: colors.primary,
  },
  heroBody: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.sm,
  },
  actions: {
    marginBottom: 56,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  primaryButtonText: {
    ...typography.bodyBold,
    color: colors.white,
    fontSize: 17,
  },
  secondaryButton: {
    borderRadius: borderRadius.md,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    ...typography.bodyBold,
    color: colors.primary,
    fontSize: 17,
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{scale: 0.98}],
  },
  secondaryPressed: {
    opacity: 0.92,
    transform: [{scale: 0.98}],
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  feature: {
    alignItems: 'center',
    flex: 1,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginBottom: spacing.sm,
  },
  featureText: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
