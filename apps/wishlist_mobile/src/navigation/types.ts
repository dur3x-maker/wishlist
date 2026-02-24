import type {NativeStackScreenProps} from '@react-navigation/native-stack';

export type RootStackParamList = {
  Landing: undefined;
  Login: undefined;
  Register: undefined;
  Main: undefined;
  WishlistDetail: {wishlistId: string};
  ItemDetail: {wishlistId: string; itemId: string};
  CreateWishlist: undefined;
  CreateItem: {wishlistId: string};
  EditItem: {wishlistId: string; itemId: string};
};

export type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;
export type RegisterScreenProps = NativeStackScreenProps<RootStackParamList, 'Register'>;
export type WishlistDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'WishlistDetail'>;
export type ItemDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'ItemDetail'>;
export type CreateWishlistScreenProps = NativeStackScreenProps<RootStackParamList, 'CreateWishlist'>;
export type CreateItemScreenProps = NativeStackScreenProps<RootStackParamList, 'CreateItem'>;
export type EditItemScreenProps = NativeStackScreenProps<RootStackParamList, 'EditItem'>;
