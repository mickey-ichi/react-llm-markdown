/** Colors and sizes of the React Native renderer. Same tokens as the web `--rlm-*` variables. */
export interface NativeTheme {
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  card: string;
  link: string;
  markBackground: string;
  markForeground: string;
  fontSize: number;
  lineHeight: number;
  monoFontFamily: string | undefined;
  /** Height of a chart drawn in a WebView. */
  chartHeight: number;
}

export type ColorScheme = 'light' | 'dark';

const BASE = {
  markBackground: '#fde68a',
  markForeground: '#1f2937',
  fontSize: 16,
  lineHeight: 24,
  monoFontFamily: undefined,
  chartHeight: 320,
} as const;

export const LIGHT_THEME: NativeTheme = {
  ...BASE,
  background: '#ffffff',
  foreground: '#18181b',
  muted: '#f4f4f5',
  mutedForeground: '#71717a',
  border: '#e4e4e7',
  card: '#fafafa',
  link: '#2563eb',
};

export const DARK_THEME: NativeTheme = {
  ...BASE,
  background: '#09090b',
  foreground: '#fafafa',
  muted: '#27272a',
  mutedForeground: '#a1a1aa',
  border: '#27272a',
  card: '#18181b',
  link: '#60a5fa',
};

export function resolveTheme(scheme: ColorScheme, overrides?: Partial<NativeTheme>): NativeTheme {
  const base = scheme === 'dark' ? DARK_THEME : LIGHT_THEME;
  return overrides ? { ...base, ...overrides } : base;
}
