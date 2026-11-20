import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { useColors } from './theme';

export function Chip({
  label,
  tone = 'plain',
  dot,
}: {
  label: string;
  tone?: 'plain' | 'job' | 'over' | 'today' | 'high' | 'up' | 'tag';
  dot?: string;
}) {
  const c = useColors();
  const map = {
    plain: { bg: c.bg, fg: c.muted, bd: c.line },
    job: { bg: c.accentSoft, fg: c.fg, bd: c.accentSoft },
    over: { bg: c.critSoft, fg: c.crit, bd: c.critSoft },
    today: { bg: c.accent, fg: c.accentInk, bd: c.accent },
    high: { bg: 'transparent', fg: c.crit, bd: c.crit },
    up: { bg: c.critSoft, fg: c.crit, bd: c.critSoft },
    tag: { bg: 'transparent', fg: c.accent, bd: c.accent },
  }[tone];
  return (
    <View style={[s.chip, { backgroundColor: map.bg, borderColor: map.bd }]}>
      {dot ? <View style={[s.dot, { backgroundColor: dot }]} /> : null}
      <Text
        style={[
          s.chipText,
          { color: map.fg, fontWeight: tone === 'plain' || tone === 'job' ? '500' : '700' },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function Btn({
  label,
  onPress,
  kind = 'plain',
  disabled,
  style,
  small,
}: {
  label: string;
  onPress: () => void;
  kind?: 'plain' | 'primary' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
  small?: boolean;
}) {
  const c = useColors();
  const bg = kind === 'primary' ? c.accent : c.surface;
  const fg = kind === 'primary' ? c.accentInk : kind === 'danger' ? c.crit : c.fg;
  const bd = kind === 'primary' ? c.accent : kind === 'danger' ? c.crit : c.line;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        { backgroundColor: bg, borderColor: bd, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      <Text style={[s.btnText, small && { fontSize: 13 }, { color: fg, fontWeight: kind === 'primary' ? '700' : '600' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps) {
  const c = useColors();
  return (
    <TextInput
      placeholderTextColor={c.muted}
      {...props}
      style={[
        s.field,
        { color: c.fg, backgroundColor: c.bg, borderColor: c.line },
        props.multiline && { minHeight: 80, textAlignVertical: 'top' },
        props.style,
      ]}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <Text style={[s.label, { color: c.muted }]}>{children}</Text>;
}

/** Row of selectable pills. */
export function Pills<T extends string>({
  options,
  value,
  onChange,
  colorFor,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  colorFor?: (k: T) => string;
}) {
  const c = useColors();
  return (
    <View style={s.pills}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={[
              s.pill,
              { borderColor: on ? c.fg : c.line, backgroundColor: on ? c.fg : c.surface },
            ]}
          >
            {colorFor ? <View style={[s.dot, { backgroundColor: colorFor(o.key) }]} /> : null}
            <Text style={{ color: on ? c.bg : c.fg, fontSize: 13, fontWeight: on ? '700' : '500' }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SectionHeading({ children, count }: { children: React.ReactNode; count?: number }) {
  const c = useColors();
  return (
    <View style={s.h2wrap}>
      <Text style={[s.h2, { color: c.muted, borderBottomColor: c.accent }]}>
        {String(children).toUpperCase()}
        {count != null ? <Text style={{ color: c.fg }}>{`  ${count}`}</Text> : null}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipText: { fontSize: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  btn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  btnSmall: { paddingHorizontal: 12, paddingVertical: 6, minHeight: 34, borderRadius: 999 },
  btnText: { fontSize: 15 },
  field: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  label: { fontSize: 11, letterSpacing: 0.8, fontWeight: '700', marginTop: 6 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  h2wrap: { flexDirection: 'row', marginTop: 18, marginBottom: 8 },
  h2: { fontSize: 11, letterSpacing: 1, fontWeight: '700', paddingBottom: 4, borderBottomWidth: 2 },
});
