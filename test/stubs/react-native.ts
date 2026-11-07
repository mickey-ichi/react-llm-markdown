// Minimal stand-ins for react-native primitives: they render as <rn-*> elements and record their
// props, so tests can inspect the tree and call handlers such as onPress.
import { createElement, type ReactNode } from 'react';

export const rendered: { type: string; props: Record<string, unknown> }[] = [];
export const opened: string[] = [];

type Props = Record<string, unknown> & { children?: ReactNode; style?: unknown };

const flatten = (style: unknown): Record<string, unknown> | undefined =>
  Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : (style as Record<string, unknown> | undefined);

function primitive(type: string) {
  return function Primitive({ children, style, ...rest }: Props) {
    rendered.push({ type, props: { ...rest, style: flatten(style) } });
    const attrs: Record<string, string> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') attrs[`data-${key.toLowerCase()}`] = String(value);
    }
    if (style) attrs['data-style'] = JSON.stringify(flatten(style));
    return createElement(`rn-${type.toLowerCase()}`, attrs, children);
  };
}

export const View = primitive('View');
export const Text = primitive('Text');
export const ScrollView = primitive('ScrollView');
export const Pressable = primitive('Pressable');
export const Image = Object.assign(primitive('Image'), {
  getSize: (_uri: string, ok: (w: number, h: number) => void) => ok(200, 100),
});
export const Linking = {
  openURL: async (url: string) => {
    opened.push(url);
  },
};
export const useColorScheme = () => 'light';
export type TextStyle = Record<string, unknown>;
export type ViewStyle = Record<string, unknown>;
