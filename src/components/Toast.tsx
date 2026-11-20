import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../theme';

export interface ToastState {
  msg: string;
  undo?: () => void;
}

export function Toast({ toast, onUndo }: { toast: ToastState | null; onUndo: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[s.toast, { backgroundColor: c.band, bottom: insets.bottom + 16 }]}
    >
      <Text style={s.msg}>{toast.msg}</Text>
      {toast.undo ? (
        <Pressable onPress={onUndo} hitSlop={10} accessibilityRole="button">
          <Text style={[s.undo, { color: c.accent }]}>Undo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    elevation: 6,
  },
  msg: { color: '#fff', fontSize: 15, flex: 1 },
  undo: { fontWeight: '800', fontSize: 15 },
});
