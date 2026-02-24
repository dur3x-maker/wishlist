import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {GradientBackground, PrimaryButton, SecondaryButton} from '../components';
import {colors, spacing} from '../theme';

export default function LandingScreen({navigation}) {
  return (
    <GradientBackground>
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            Wishlist
          </Text>
          <Text style={styles.heroSubtitle}>
            Share your wishes ✨{'\n'}
            <Text style={styles.heroAccent}>surprise</Text> your friends
          </Text>
          <Text style={styles.heroBody}>
            Create wishlists, share them with loved ones, and make gift-giving effortless.
          </Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            title="Get started free"
            onPress={() => navigation.navigate('Register')}
            style={styles.actionBtn}
          />
          <SecondaryButton
            title="Log in"
            onPress={() => navigation.navigate('Login')}
          />
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
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
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
    fontWeight: '900',
    color: colors.white,
    textAlign: 'center',
    letterSpacing: -1.5,
    marginBottom: spacing.lg,
  },
  heroSubtitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: spacing.lg,
  },
  heroAccent: {
    color: colors.accent,
  },
  heroBody: {
    fontSize: 15,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.sm,
  },
  actions: {
    alignSelf: 'stretch',
    marginBottom: 56,
  },
  actionBtn: {
    marginBottom: spacing.md,
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
    backgroundColor: colors.accent,
    marginBottom: spacing.sm,
  },
  featureText: {
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
