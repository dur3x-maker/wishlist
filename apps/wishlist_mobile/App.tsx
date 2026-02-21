import React, {useEffect} from 'react';
import {StatusBar, useColorScheme, View, ActivityIndicator, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import {AuthProvider, useAuthContext} from './src/hooks/AuthContext';
import {pingBackend} from './src/api/client';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 0,
    },
  },
});

function AppInner() {
  const isDarkMode = useColorScheme() === 'dark';
  const {user, loading, reload, logout} = useAuthContext();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer>
        <RootNavigator
          isAuthenticated={!!user}
          onLogin={reload}
          onLogout={logout}
        />
      </NavigationContainer>
    </>
  );
}

function App() {
  useEffect(() => {
    pingBackend();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {flex: 1, justifyContent: 'center', alignItems: 'center'},
});

export default App;
