import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {RootStackParamList} from './types';
import WishlistListScreen from '../screens/WishlistListScreen';
import WishlistDetailScreen from '../screens/WishlistDetailScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import CreateWishlistScreen from '../screens/CreateWishlistScreen';
import CreateItemScreen from '../screens/CreateItemScreen';
import EditItemScreen from '../screens/EditItemScreen';
import LandingScreen from '../screens/LandingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const darkHeader = {
  headerStyle: {backgroundColor: 'transparent'},
  headerTransparent: true,
  headerTintColor: '#FFFFFF',
  headerTitleStyle: {color: '#FFFFFF', fontWeight: '700' as const},
  headerShadowVisible: false,
};

interface Props {
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
}

export default function RootNavigator({isAuthenticated, onLogin, onLogout}: Props) {
  if (!isAuthenticated) {
    return (
      <Stack.Navigator initialRouteName="Landing" screenOptions={darkHeader}>
        <Stack.Screen name="Landing" component={LandingScreen} options={{headerShown: false}} />
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
    <Stack.Navigator screenOptions={darkHeader}>
      <Stack.Screen name="Main" options={{title: 'My Wishlists', headerShown: false}}>
        {(props) => <WishlistListScreen {...props} onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen
        name="WishlistDetail"
        component={WishlistDetailScreen}
        options={{title: 'Wishlist'}}
      />
      <Stack.Screen
        name="ItemDetail"
        component={ItemDetailScreen}
        options={{title: 'Item Details'}}
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
      <Stack.Screen
        name="EditItem"
        component={EditItemScreen}
        options={{title: 'Edit Item'}}
      />
    </Stack.Navigator>
  );
}
