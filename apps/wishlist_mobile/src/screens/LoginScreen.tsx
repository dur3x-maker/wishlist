import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {login, googleAuth} from '../api/auth';
import {colors, spacing, typography, borderRadius} from '../theme';
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Wishlist</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable
        style={({pressed}) => [styles.button, pressed && styles.pressedState]}
        onPress={handleLogin}
        disabled={loading || googleLoading}>
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </Pressable>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>
      <Pressable
        style={({pressed}) => [styles.googleButton, pressed && styles.pressedState]}
        onPress={handleGoogleLogin}
        disabled={loading || googleLoading}>
        {googleLoading ? (
          <ActivityIndicator color={colors.text.primary} />
        ) : (
          <Text style={styles.googleButtonText}>Sign in with Google</Text>
        )}
      </Pressable>

      <Pressable
        style={({pressed}) => [styles.link, pressed && {opacity: 0.6}]}
        onPress={navigateToRegister}>
        <Text style={styles.linkText}>Don't have an account? Register</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    marginBottom: spacing.xxxl,
    textAlign: 'center',
    color: colors.text.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
    backgroundColor: colors.background.secondary,
    color: colors.text.primary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600' as const,
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
    borderWidth: 1.5,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  googleButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  link: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  linkText: {
    color: colors.primary,
    fontSize: 14,
  },
  pressedState: {
    opacity: 0.92,
    transform: [{scale: 0.98}],
  },
});
