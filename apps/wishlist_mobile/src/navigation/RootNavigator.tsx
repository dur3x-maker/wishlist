import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {RootStackParamList} from './types';
import WishlistListScreen from '../screens/WishlistListScreen';
import WishlistDetailScreen from '../screens/WishlistDetailScreen';
import CreateWishlistScreen from '../screens/CreateWishlistScreen';
import CreateItemScreen from '../screens/CreateItemScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface Props {
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
}

export default function RootNavigator({isAuthenticated, onLogin, onLogout}: Props) {
  if (!isAuthenticated) {
    return (
      <Stack.Navigator>
        <Stack.Screen name="Login" options={{headerShown: false}}>
          {(props) => <LoginScreen {...props} onLogin={onLogin} />}
        </Stack.Screen>
        <Stack.Screen name="Register" options={{title: 'Create Account'}}>
          {(props) => <RegisterScreen {...props} onLogin={onLogin} />}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator>
      <Stack.Screen name="Main" options={{title: 'My Wishlists'}}>
        {(props) => <WishlistListScreen {...props} onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen
        name="WishlistDetail"
        component={WishlistDetailScreen}
        options={{title: 'Wishlist'}}
      />
      <Stack.Screen
        name="CreateWishlist"
        component={CreateWishlistScreen}
        options={{title: 'New Wishlist'}}
      />
      <Stack.Screen
        name="CreateItem"
        component={CreateItemScreen}
        options={{title: 'Add Item'}}
      />
    </Stack.Navigator>
  );
}
