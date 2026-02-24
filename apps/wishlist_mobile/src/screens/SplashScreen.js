import React, {useEffect} from 'react';
import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';
import {colors, spacing, typography} from '../theme';

export default function SplashScreen({onFinish}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🎁</Text>
      <Text style={styles.title}>Wishlist</Text>
      <ActivityIndicator 
        size="small" 
        color={colors.primary} 
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: spacing.xxxl,
  },
  loader: {
    marginTop: spacing.lg,
  },
});
