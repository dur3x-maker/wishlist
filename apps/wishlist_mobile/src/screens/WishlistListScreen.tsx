import React, {useCallback, useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
  Animated,
  PanResponder,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {listWishlists, deleteWishlist} from '../api/wishlists';
import {WEB_BASE_URL} from '../api/client';
import {useAuthContext} from '../hooks/AuthContext';
import {colors, spacing, typography, shadows, borderRadius} from '../theme';
import {getTimeRemaining, formatDeadlineDate, getTotalDaysLeft, isExpired} from '../utils/countdown';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import type {WishlistListItem} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Main'> & {
  onLogout: () => void;
};

export default function WishlistListScreen({navigation, onLogout}: Props) {
  const queryClient = useQueryClient();
  const {user} = useAuthContext();
  const [refreshKey, setRefreshKey] = useState(0);
  const {data, isLoading, isError, refetch} = useQuery<WishlistListItem[]>({
    queryKey: ['wishlists'],
    queryFn: listWishlists,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const handleCreate = useCallback(() => {
    navigation.navigate('CreateWishlist');
  }, [navigation]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={onLogout} style={styles.headerMarginR}>
          <Text style={styles.headerBtn}>Logout</Text>
        </TouchableOpacity>
      ),
      headerLeft: () => (
        <TouchableOpacity onPress={handleCreate} style={styles.headerMarginL}>
          <Text style={styles.headerPlus}>+</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, onLogout, handleCreate]);

  const handleDelete = useCallback(
    (id: string, title: string) => {
      Alert.alert(
        'Вы уверены?',
        `Удалить вишлист "${title}"?`,
        [
          {text: 'Отмена', style: 'cancel'},
          {
            text: 'Да',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteWishlist(id);
                queryClient.invalidateQueries({queryKey: ['wishlists']});
              } catch (e: any) {
                console.error('Delete wishlist failed', e);
                Alert.alert('Error', e.message ?? 'Delete failed');
              }
            },
          },
        ],
      );
    },
    [queryClient],
  );

  const handleShare = useCallback((accessToken: string) => {
    const publicUrl = `${WEB_BASE_URL}/w/${accessToken}`;
    Share.share({message: `Check out my wishlist: ${publicUrl}`, url: publicUrl});
  }, []);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const keyExtractor = useCallback((i: WishlistListItem) => i.id, []);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load wishlists</Text>
        <TouchableOpacity onPress={handleRetry} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasWishlists = data && data.length > 0;

  const renderItem = ({item}: {item: WishlistListItem}) => (
    <SwipeableCard
      item={item}
      onPress={() => navigation.navigate('WishlistDetail', {wishlistId: item.id})}
      onDelete={() => handleDelete(item.id, item.title)}
      onShare={() => handleShare(item.access_token)}
      refreshKey={refreshKey}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome, <Text style={styles.welcomeName}>{user?.display_name || 'there'}!</Text>
        </Text>
      </View>
      {!hasWishlists ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎁</Text>
          <Text style={styles.emptyTitle}>Add your first wishlist</Text>
          <Text style={styles.emptySubtitle}>
            Create a wishlist to organize your wishes and share them with friends
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleCreate}>
            <Text style={styles.primaryButtonText}>Create wishlist</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

function SwipeableCard({item, onPress, onDelete, onShare, refreshKey}: any) {
  const translateX = React.useRef(new Animated.Value(0)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const [swiping, setSwiping] = React.useState(false);
  const [hasAnimated, setHasAnimated] = React.useState(false);

  React.useEffect(() => {
    if (!hasAnimated) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
      setHasAnimated(true);
    }
  }, [fadeAnim, hasAnimated]);

  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: () => {
        setSwiping(true);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -100));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        setSwiping(false);
        if (gestureState.dx < -60) {
          Animated.timing(translateX, {
            toValue: -100,
            duration: 200,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const timeLeft = getTimeRemaining(item.deadline);
  const deadlineDate = formatDeadlineDate(item.deadline);
  const daysLeft = getTotalDaysLeft(item.deadline);
  const expired = isExpired(item.deadline);

  const getDeadlineColor = () => {
    if (expired) return colors.text.tertiary;
    if (daysLeft < 3) return colors.status.error;
    if (daysLeft <= 7) return '#F59E0B';
    return colors.primary;
  };

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.deleteBackground}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
            onDelete();
          }}>
          <Text style={styles.deleteText}>🗑️</Text>
        </TouchableOpacity>
      </View>
      <Animated.View
        style={[styles.cardWrapper, {transform: [{translateX}], opacity: fadeAnim}]}
        {...panResponder.panHandlers}>
        <TouchableOpacity
          style={styles.card}
          onPress={onPress}
          activeOpacity={0.7}
          disabled={swiping}>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.description ? (
              <Text style={styles.cardDesc} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}
            {item.deadline && (
              <View style={styles.deadlineContainer}>
                <Text style={[styles.deadlineDate, {color: getDeadlineColor()}]}>
                  Due {deadlineDate}
                </Text>
                <Text style={[styles.timeLeft, {color: getDeadlineColor()}]}>
                  {timeLeft}
                </Text>
              </View>
            )}
            <View style={styles.metaRow}>
              <Text style={styles.cardMeta}>
                {item.item_count} item{item.item_count !== 1 ? 's' : ''}
              </Text>
              <TouchableOpacity onPress={onShare}>
                <Text style={styles.shareText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  welcomeText: {
    ...typography.h3,
    color: colors.text.primary,
  },
  welcomeName: {
    color: colors.primary,
  },
  list: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  headerMarginR: {marginRight: spacing.xs},
  headerMarginL: {marginLeft: spacing.xs},
  headerBtn: {
    ...typography.small,
    color: colors.primary,
  },
  headerPlus: {
    fontSize: 24,
    lineHeight: 28,
    color: colors.primary,
  },
  swipeContainer: {
    marginBottom: spacing.md,
    position: 'relative',
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: colors.status.error,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    padding: spacing.lg,
  },
  deleteText: {
    fontSize: 28,
  },
  cardWrapper: {
    backgroundColor: 'transparent',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.h5,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  cardDesc: {
    ...typography.small,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  deadlineDate: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  timeLeft: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  cardMeta: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  shareText: {
    ...typography.smallBold,
    color: colors.primary,
  },
  errorText: {
    ...typography.body,
    color: colors.status.error,
    marginBottom: spacing.md,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  retryText: {
    ...typography.bodyBold,
    color: colors.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxxl,
    ...shadows.md,
  },
  primaryButtonText: {
    ...typography.bodyBold,
    color: colors.white,
  },
});
