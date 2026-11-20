import { useColorScheme } from 'react-native';

// EFT Group house colours, with a matching dark mode.
const light = {
  band: '#212429',
  bandFg: '#ffffff',
  bandSub: '#a9adb3',
  accent: '#fc5202',
  accentInk: '#ffffff',
  accentSoft: '#fff0e8',
  bg: '#f5f7fa',
  surface: '#ffffff',
  line: '#d9dde3',
  fg: '#212429',
  muted: '#626468',
  crit: '#c62828',
  critSoft: '#fdecec',
  ok: '#2e7d4f',
};

const dark: typeof light = {
  band: '#0f1113',
  bandFg: '#ffffff',
  bandSub: '#9097a0',
  accent: '#fc5202',
  accentInk: '#ffffff',
  accentSoft: '#3a1f12',
  bg: '#17191c',
  surface: '#212429',
  line: '#33373d',
  fg: '#eef0f3',
  muted: '#9a9ea5',
  crit: '#ff6b6b',
  critSoft: '#3a1c1c',
  ok: '#5cc58a',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}
