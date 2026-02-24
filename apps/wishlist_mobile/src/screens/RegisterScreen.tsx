import React, {useState} from 'react';
import {
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {register} from '../api/auth';
import {colors, spacing} from '../theme';
import {GradientBackground, GlassCard, GlassInput, PrimaryButton} from '../components';
import type {RegisterScreenProps} from '../navigation/types';

interface Props extends RegisterScreenProps {
  onLogin: () => void;
}

export default function RegisterScreen({onLogin}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const handleRegister = async () => {
    if (!email || !password || !displayName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, displayName.trim());
      onLogin();
    } catch (e: any) {
      Alert.alert('Registration failed', e.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            {paddingTop: insets.top + 80, paddingBottom: insets.bottom + spacing.xl},
          ]}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Wishlist today</Text>

          <GlassCard style={styles.formCard}>
            <GlassInput
              placeholder="Display name"
              value={displayName}
              onChangeText={setDisplayName}
              style={styles.inputSpacing}
            />
            <GlassInput
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              style={styles.inputSpacing}
            />
            <GlassInput
              placeholder="Password (min 6 chars)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={styles.inputSpacing}
            />
            <PrimaryButton
              title="Register"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              style={styles.registerBtn}
            />
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flex1: {flex: 1},
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  title: {
    fontSize: 32,
    fontWeight: '900' as const,
    marginBottom: spacing.xs,
    textAlign: 'center',
    color: colors.white,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
  },
  formCard: {
    padding: spacing.xxl,
  },
  inputSpacing: {
    marginBottom: spacing.md,
  },
  registerBtn: {
    marginTop: spacing.sm,
  },
});
