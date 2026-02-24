import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView} from 'react-native';
import {colors, spacing, typography, shadows, borderRadius} from '../theme';

export default function LandingScreen({navigation}) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🎁</Text>
        <Text style={styles.brandName}>Wishlist</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>
          Share your wishes,{'\n'}
          <Text style={styles.heroTitleAccent}>surprise</Text> your friends
        </Text>
        <Text style={styles.heroSubtitle}>
          Create wishlists, share them with loved ones, and make gift-giving effortless
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>Get started free</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.7}>
          <Text style={styles.secondaryButtonText}>Log in</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.features}>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>✨</Text>
          <Text style={styles.featureText}>Easy wishlist creation</Text>
        </View>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>🔗</Text>
          <Text style={styles.featureText}>Share with anyone</Text>
        </View>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>🎯</Text>
          <Text style={styles.featureText}>Track progress</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.huge,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.huge,
  },
  logo: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  brandName: {
    ...typography.h4,
    color: colors.primary,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.huge,
  },
  heroTitle: {
    ...typography.h1,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  heroTitleAccent: {
    color: colors.primary,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    marginBottom: spacing.huge,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  primaryButtonText: {
    ...typography.bodyBold,
    color: colors.white,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.xl,
  },
  feature: {
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  featureText: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
