import React from 'react';
import {View, StyleSheet, Animated} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, borderRadius} from '../theme';

interface Props {
  progress: number; // 0-100
  animated?: boolean;
  height?: number;
}

export default function GradientProgressBar({progress, height = 12}: Props) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <View style={[styles.track, {height, borderRadius: height / 2}]}>
      <LinearGradient
        colors={[colors.primary, colors.primaryLight]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={[
          styles.fill,
          {
            width: `${clampedProgress}%` as any,
            height,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

export function AnimatedGradientProgressBar({progress, height = 12}: Props) {
  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [anim, progress]);

  const animatedWidth = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.track, {height, borderRadius: height / 2}]}>
      <Animated.View
        style={[
          styles.fillAnimated,
          {
            width: animatedWidth,
            height,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  fill: {
    // gradient applied via LinearGradient
  },
  fillAnimated: {
    backgroundColor: colors.primary,
  },
});
