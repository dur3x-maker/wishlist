import React, {useEffect, useState} from 'react';
import {StatusBar, useColorScheme} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import {AuthProvider, useAuthContext} from './src/hooks/AuthContext';
import {pingBackend} from './src/api/client';
import SplashScreen from './src/screens/SplashScreen';

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
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash || loading) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
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
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppInner />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
