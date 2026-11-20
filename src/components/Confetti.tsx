import React, { useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

const COLORS = ['#fc5202', '#ff8a3d', '#ffc29a', '#ffffff', '#212429'];

/** Orange EFT confetti burst, shown when the list is cleared. */
export function Confetti({ run, onDone }: { run: number; onDone: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;
  const { width: W, height: H } = Dimensions.get('window');
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, () => ({
        x0: W / 2 + (Math.random() - 0.5) * W * 0.3,
        dx: (Math.random() - 0.5) * W * 1.1,
        up: H * (0.15 + Math.random() * 0.25),
        fall: H * (0.55 + Math.random() * 0.4),
        rot: (Math.random() - 0.5) * 1440,
        w: 6 + Math.random() * 6,
        h: 4 + Math.random() * 5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      })),
    // New pieces for each run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run],
  );

  useEffect(() => {
    if (!run) return;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        onDone();
        return;
      }
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => onDone());
    });
    return () => {
      cancelled = true;
    };
  }, [run, onDone, progress]);

  if (!run) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => {
        const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [p.x0, p.x0 + p.dx] });
        const translateY = progress.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [H * 0.35, H * 0.35 - p.up, H * 0.35 - p.up + p.fall],
        });
        const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rot}deg`] });
        const opacity = progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: p.w,
              height: p.h,
              backgroundColor: p.color,
              opacity,
              transform: [{ translateX }, { translateY }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}
