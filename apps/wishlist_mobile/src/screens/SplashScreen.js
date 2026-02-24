import React, {useEffect, useRef} from 'react';
import {Text, StyleSheet, Animated} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, spacing} from '../theme';

export default function SplashScreen({onFinish}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {toValue: 1, duration: 600, useNativeDriver: true}),
      Animated.spring(scaleAnim, {toValue: 1, friction: 8, useNativeDriver: true}),
    ]).start();

    const timer = setTimeout(() => {
      onFinish();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [onFinish, fadeAnim, scaleAnim]);

  return (
    <LinearGradient
      colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
      style={styles.container}>
      <Animated.View style={[styles.logoWrap, {opacity: fadeAnim, transform: [{scale: scaleAnim}]}]}>
        <Text style={styles.logo}>🎁</Text>
        <Text style={styles.title}>Wishlist</Text>
        <Text style={styles.subtitle}>Your wishes, beautifully organized</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrap: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 72,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -1,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
});
