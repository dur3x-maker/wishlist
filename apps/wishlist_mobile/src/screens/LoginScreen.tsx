import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {login, googleAuth} from '../api/auth';
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
      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading || googleLoading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>
      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleGoogleLogin}
        disabled={loading || googleLoading}>
        {googleLoading ? (
          <ActivityIndicator color="#333" />
        ) : (
          <Text style={styles.googleButtonText}>Sign in with Google</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.link} onPress={navigateToRegister}>
        <Text style={styles.linkText}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 32,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#aaa',
    fontSize: 13,
  },
  googleButton: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#6C63FF',
    fontSize: 14,
  },
});
