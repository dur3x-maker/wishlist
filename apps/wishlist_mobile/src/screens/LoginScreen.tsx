import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {login, googleAuth} from '../api/auth';
import {colors, spacing} from '../theme';
import {GradientBackground, GlassCard, GlassInput, PrimaryButton} from '../components';
import type {LoginScreenProps} from '../navigation/types';

GoogleSignin.configure({
  iosClientId: '701578950612-pkvl1pr8595u4ocskjumir7ss71c18v1.apps.googleusercontent.com',
  webClientId: '701578950612-95r0mc8e22rsh4ameih9sjd7bo8spj9j.apps.googleusercontent.com',
  offlineAccess: true,
  scopes: ['profile', 'email'],
});

interface Props extends LoginScreenProps {
  onLogin: () => void;
}

export default function LoginScreen({navigation, onLogin}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      onLogin();
    } catch (e: any) {
      console.error('Login failed', e);
      Alert.alert('Login failed', e.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [email, password, onLogin]);

  const handleGoogleLogin = useCallback(async () => {
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      // User cancelled — silently ignore
      if (response?.type === 'cancelled') {
        return;
      }

      const serverAuthCode = response?.data?.serverAuthCode;
      if (!serverAuthCode) {
        console.error('Google Sign-In: no serverAuthCode on success response', response);
        Alert.alert('Error', 'Failed to get Google auth code. Check Google config.');
        return;
      }
      await googleAuth(serverAuthCode, '');
      onLogin();
    } catch (e: any) {
      // Also guard against thrown cancellation (older SDK versions)
      if (e?.code === 'SIGN_IN_CANCELLED' || e?.code === 'SIGN_IN_REQUIRED') {
        return;
      }
      console.error('Google login failed', e);
      Alert.alert('Google login failed', e.message ?? 'Unknown error');
    } finally {
      setGoogleLoading(false);
    }
  }, [onLogin]);

  const navigateToRegister = useCallback(() => {
    navigation.navigate('Register');
  }, [navigation]);

  const insets = useSafeAreaInsets();

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            {paddingTop: insets.top + spacing.xxxl, paddingBottom: insets.bottom + spacing.xl},
          ]}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          <Text style={styles.title}>Wishlist</Text>
          <Text style={styles.subtitle}>Welcome back</Text>

          <GlassCard style={styles.formCard}>
            <GlassInput
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              style={styles.inputSpacing}
            />
            <GlassInput
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={styles.inputSpacing}
            />
            <PrimaryButton
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              disabled={loading || googleLoading}
              style={styles.signInBtn}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              android_ripple={null}
              style={({pressed}) => [styles.googleButton, pressed && styles.pressedState]}
              onPress={handleGoogleLogin}
              disabled={loading || googleLoading}>
              {googleLoading ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              )}
            </Pressable>
          </GlassCard>

          <Pressable
            android_ripple={null}
            style={({pressed}) => [styles.link, pressed && {opacity: 0.6}]}
            onPress={navigateToRegister}>
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkAccent}>Register</Text>
            </Text>
          </Pressable>
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
    fontSize: 42,
    fontWeight: '900' as const,
    marginBottom: spacing.xs,
    textAlign: 'center',
    color: colors.white,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
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
  signInBtn: {
    marginTop: spacing.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.light,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    color: colors.text.tertiary,
    fontSize: 13,
  },
  googleButton: {
    height: 58,
    borderWidth: 1,
    borderColor: colors.glass.borderLight,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass.bgLight,
  },
  googleButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  link: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  linkText: {
    color: colors.text.tertiary,
    fontSize: 14,
  },
  linkAccent: {
    color: colors.accent,
    fontWeight: '600' as const,
  },
  pressedState: {
    opacity: 0.88,
    transform: [{scale: 0.97}],
  },
});
