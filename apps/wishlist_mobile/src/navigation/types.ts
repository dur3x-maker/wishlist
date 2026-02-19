import type {NativeStackScreenProps} from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  WishlistDetail: {wishlistId: string};
  CreateWishlist: undefined;
  CreateItem: {wishlistId: string};
};

export type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;
export type RegisterScreenProps = NativeStackScreenProps<RootStackParamList, 'Register'>;
export type WishlistDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'WishlistDetail'>;
export type CreateWishlistScreenProps = NativeStackScreenProps<RootStackParamList, 'CreateWishlist'>;
export type CreateItemScreenProps = NativeStackScreenProps<RootStackParamList, 'CreateItem'>;
