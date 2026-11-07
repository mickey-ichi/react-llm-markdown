import type {
  Blockquote,
  Code,
  Definition,
  FootnoteDefinition,
  Heading,
  List,
  ListItem,
  Nodes,
  PhrasingContent,
  Root,
  RootContent,
  Table,
} from 'mdast';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  type TextStyle,
  useColorScheme,
  View,
  type ViewStyle,
} from 'react-native';

import { parseMarkdown } from '../core/parse.ts';
import { type CodeHighlighter, createCodeHighlighter } from './highlight.ts';
import { type ColorScheme, type NativeTheme, resolveTheme } from './theme.ts';
import { RichBlock, type WebViewComponent } from './rich-block.tsx';
import { echartsHtml, mathHtml, mermaidHtml, type ScriptSource } from './webview-html.ts';

/** Rich-block features. All on by default; math, Mermaid and ECharts also need `webView`. */
export interface NativeFeatures {
  code?: boolean;
  math?: boolean;
  mermaid?: boolean;
  echarts?: boolean;
  cjk?: boolean;
}

export interface MarkdownViewProps {
  /** The Markdown source. */
  children: string;
  /** `true` while the text is still streaming in: incomplete Markdown is repaired. Default `false`. */
  streaming?: boolean;
  /** Render a single newline as a line break, like a chat message. Default `true`. */
  softBreaks?: boolean;
  features?: NativeFeatures;
  /**
   * `WebView` from `react-native-webview`. Enables display math, Mermaid and ECharts; without it
   * those blocks show their source.
   */
  webView?: WebViewComponent;
  /**
   * What the WebViews load (default: pinned jsDelivr URLs with SRI): the Mermaid and ECharts scripts, and KaTeX's
   * stylesheet for math (offline, math falls back to MathML).
   */
  scripts?: { mermaid?: ScriptSource; echarts?: ScriptSource; katex?: ScriptSource };
  /** Light or dark. Default: the device setting. */
  colorScheme?: ColorScheme;
  /** Override theme colors and sizes. */
  theme?: Partial<NativeTheme>;
  /** Base URL for relative links and images. Without it they are not opened / not loaded. */
  baseUrl?: string;
  /** Called on a link press. Return `false` to stop the default (open in the browser). */
  onLinkPress?: (url: string) => boolean | void;
  /** Shows a "Copy" button on code blocks and calls this with the code. */
  onCopyCode?: (code: string) => void;
  /** Custom code highlighter, or `false` for plain code. Default: Shiki with a few common languages. */
  highlighter?: CodeHighlighter | false;
  style?: ViewStyle;
}

const OPENABLE = /^(https?:|mailto:)/i;

let defaultHighlighter: CodeHighlighter | undefined;

/** An absolute URL for `url`, or null when it is relative and there is no usable base. */
export function resolveUrl(url: string, baseUrl?: string): string | null {
  if (OPENABLE.test(url)) return url;
  if (!baseUrl || url.startsWith('#')) return null;
  try {
    const resolved = new URL(url, baseUrl).toString();
    return OPENABLE.test(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

/** Removes tags (and script / style contents) from raw HTML, for showing its text only. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

interface Context {
  theme: NativeTheme;
  scheme: ColorScheme;
  styles: ReturnType<typeof makeStyles>;
  props: MarkdownViewProps;
  definitions: Map<string, Definition>;
  footnotes: Map<string, number>;
  highlight: CodeHighlighter | null;
}

function makeStyles(theme: NativeTheme) {
  const text: TextStyle = { color: theme.foreground, fontSize: theme.fontSize, lineHeight: theme.lineHeight };
  const mono: TextStyle = { fontFamily: theme.monoFontFamily ?? 'Menlo', fontSize: theme.fontSize * 0.85 };
  return {
    root: { gap: 12 } as ViewStyle,
    text,
    mono,
    headings: [2, 1.6, 1.3, 1.15, 1, 0.9].map(
      (scale): TextStyle => ({
        ...text,
        fontSize: theme.fontSize * scale,
        lineHeight: theme.fontSize * scale * 1.3,
        fontWeight: '700',
      }),
    ),
    inlineCode: { ...mono, backgroundColor: theme.muted, color: theme.foreground } as TextStyle,
    link: { color: theme.link } as TextStyle,
    mark: { backgroundColor: theme.markBackground, color: theme.markForeground } as TextStyle,
    small: { fontSize: theme.fontSize * 0.75, lineHeight: theme.lineHeight * 0.75 } as TextStyle,
    card: { backgroundColor: theme.card, borderRadius: 10, overflow: 'hidden' } as ViewStyle,
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.muted,
      paddingHorizontal: 12,
      height: 32,
    } as ViewStyle,
    cardLabel: { color: theme.mutedForeground, fontSize: 12, fontWeight: '600' } as TextStyle,
    cardBody: { padding: 12 } as ViewStyle,
    quote: { borderLeftWidth: 3, borderLeftColor: theme.border, paddingLeft: 12, gap: 8 } as ViewStyle,
    rule: { height: 1, backgroundColor: theme.border } as ViewStyle,
    row: { flexDirection: 'row', gap: 8 } as ViewStyle,
    marker: { ...text, minWidth: 18, textAlign: 'right' } as TextStyle,
    cell: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderColor: theme.border,
      minWidth: 80,
      maxWidth: 320,
    } as ViewStyle,
  };
}

function nodeKey(index: number, node: { type: string }) {
  return `${node.type}-${index}`;
}

// ---------- inline ----------

type InlineStyle = TextStyle | undefined;

function renderInlines(nodes: PhrasingContent[], ctx: Context): ReactNode[] {
  const out: ReactNode[] = [];
  // Raw inline HTML: honor <mark>, <sub>, <sup> and <br>; drop every other tag (its text stays).
  const open: string[] = [];
  nodes.forEach((node, index) => {
    if (node.type === 'html') {
      const tag = /^<\s*(\/?)\s*([a-z0-9]+)/i.exec(node.value);
      if (!tag) return;
      const name = tag[2]!.toLowerCase();
      if (name === 'br') out.push('\n');
      else if (tag[1]) {
        const at = open.lastIndexOf(name);
        if (at >= 0) open.splice(at, 1);
      } else if (['mark', 'sub', 'sup'].includes(name)) open.push(name);
      return;
    }
    const style: InlineStyle = open.reduce<TextStyle>(
      (acc, name) => ({ ...acc, ...(name === 'mark' ? ctx.styles.mark : ctx.styles.small) }),
      {},
    );
    const rendered = renderInline(node, ctx, index);
    out.push(open.length ? <Text key={`h-${index}`} style={style}>{rendered}</Text> : rendered);
  });
  return out;
}

function renderInline(node: PhrasingContent, ctx: Context, index: number): ReactNode {
  const key = nodeKey(index, node);
  const { styles } = ctx;
  switch (node.type) {
    case 'text':
      return node.value;
    case 'break':
      return '\n';
    case 'strong':
      return <Text key={key} style={{ fontWeight: '700' }}>{renderInlines(node.children, ctx)}</Text>;
    case 'emphasis':
      return <Text key={key} style={{ fontStyle: 'italic' }}>{renderInlines(node.children, ctx)}</Text>;
    case 'delete':
      return <Text key={key} style={{ textDecorationLine: 'line-through' }}>{renderInlines(node.children, ctx)}</Text>;
    case 'inlineCode':
      return <Text key={key} style={styles.inlineCode}>{` ${node.value} `}</Text>;
    case 'inlineMath':
      return <Text key={key} style={styles.inlineCode}>{` ${node.value} `}</Text>;
    case 'link':
      return renderLink(key, node.url, renderInlines(node.children, ctx), ctx);
    case 'linkReference': {
      const definition = ctx.definitions.get(node.identifier.toLowerCase());
      const children = renderInlines(node.children, ctx);
      return definition ? renderLink(key, definition.url, children, ctx) : <Text key={key}>{children}</Text>;
    }
    case 'image':
      return <Text key={key} style={styles.link}>{`[${node.alt || 'image'}]`}</Text>;
    case 'imageReference':
      return <Text key={key}>{`[${node.alt || 'image'}]`}</Text>;
    case 'footnoteReference': {
      const number = ctx.footnotes.get(node.identifier.toLowerCase());
      return (
        <Text key={key} style={[styles.small, styles.link]}>
          {`[${number ?? node.label ?? node.identifier}]`}
        </Text>
      );
    }
    default:
      return null;
  }
}

function renderLink(key: string, url: string, children: ReactNode, ctx: Context): ReactNode {
  // In-page anchors (and links the URL policy replaced with `#`) have nowhere to go on native.
  if (url === '' || url.startsWith('#')) return <Text key={key}>{children}</Text>;
  const target = resolveUrl(url, ctx.props.baseUrl);
  const onPress = () => {
    if (ctx.props.onLinkPress?.(target ?? url) === false) return;
    if (target) void Linking.openURL(target);
  };
  return (
    <Text accessibilityRole="link" key={key} onPress={onPress} style={ctx.styles.link}>
      {children}
    </Text>
  );
}

// ---------- blocks ----------

function AutoImage({ uri, alt }: { uri: string; alt: string }) {
  const [ratio, setRatio] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    Image.getSize(
      uri,
      (width, height) => active && height > 0 && setRatio(width / height),
      () => active && setRatio(16 / 9),
    );
    return () => {
      active = false;
    };
  }, [uri]);
  return (
    <Image
      accessibilityLabel={alt}
      resizeMode="contain"
      source={{ uri }}
      style={{ width: '100%', aspectRatio: ratio ?? 16 / 9, borderRadius: 4 }}
    />
  );
}

function CodeCard({ label, code, ctx, children }: { label: string; code: string; ctx: Context; children: ReactNode }) {
  const { styles, props } = ctx;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardLabel}>{label.toUpperCase()}</Text>
        {props.onCopyCode ? (
          <Pressable accessibilityLabel="Copy code" accessibilityRole="button" hitSlop={8} onPress={() => props.onCopyCode?.(code)}>
            <Text style={styles.cardLabel}>Copy</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function renderCode(node: Code, ctx: Context, key: string): ReactNode {
  const { props, theme, styles, scheme } = ctx;
  const lang = (node.lang ?? '').toLowerCase();
  const feature = (name: keyof NativeFeatures) => props.features?.[name] !== false;
  const WebView = props.webView;
  if (WebView && feature('mermaid') && lang === 'mermaid') {
    return (
      <CodeCard code={node.value} ctx={ctx} key={key} label="Mermaid">
        <RichBlock html={mermaidHtml(node.value, theme, scheme === 'dark', props.scripts?.mermaid)} minHeight={80} webView={WebView} />
      </CodeCard>
    );
  }
  if (WebView && feature('echarts') && (lang === 'echarts' || lang === 'chart') && !props.streaming) {
    let html: string | null = null;
    try {
      html = echartsHtml(node.value, theme, props.scripts?.echarts);
    } catch {
      html = null;
    }
    if (html) {
      return (
        <CodeCard code={node.value} ctx={ctx} key={key} label="ECharts">
          <RichBlock html={html} minHeight={theme.chartHeight} webView={WebView} />
        </CodeCard>
      );
    }
  }
  const lines = feature('code') && ctx.highlight && lang ? ctx.highlight(node.value, lang, scheme) : null;
  return (
    <CodeCard code={node.value} ctx={ctx} key={key} label={lang || 'code'}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.cardBody}>
          <Text selectable style={[styles.mono, { color: theme.foreground, lineHeight: theme.fontSize * 1.35 }]}>
            {lines
              ? lines.map((line, i) => (
                  <Text key={i}>
                    {line.map((token, j) => (
                      <Text key={j} style={token.color ? { color: token.color } : undefined}>
                        {token.content}
                      </Text>
                    ))}
                    {i < lines.length - 1 ? '\n' : ''}
                  </Text>
                ))
              : node.value}
          </Text>
        </View>
      </ScrollView>
    </CodeCard>
  );
}

function renderTable(node: Table, ctx: Context, key: string): ReactNode {
  const { styles, theme } = ctx;
  const align = (index: number): TextStyle['textAlign'] => {
    const value = node.align?.[index];
    return value === 'center' || value === 'right' ? value : 'left';
  };
  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      horizontal
      key={key}
      style={[styles.card, { borderWidth: 1, borderColor: theme.border }]}
    >
      <View style={{ flexGrow: 1 }}>
        {node.children.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row', backgroundColor: r === 0 ? theme.muted : undefined }}>
            {row.children.map((cell, c) => (
              <View key={c} style={[styles.cell, { flex: 1 }]}>
                <Text selectable style={[styles.text, { textAlign: align(c), fontWeight: r === 0 ? '600' : undefined }]}>
                  {renderInlines(cell.children, ctx)}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function renderList(node: List, ctx: Context, key: string): ReactNode {
  const start = node.start ?? 1;
  return (
    <View key={key} style={{ gap: 4 }}>
      {node.children.map((item: ListItem, index) => {
        const marker =
          item.checked === true ? '☑' : item.checked === false ? '☐' : node.ordered ? `${start + index}.` : '•';
        return (
          <View key={index} style={ctx.styles.row}>
            <Text style={ctx.styles.marker}>{marker}</Text>
            <View style={{ flex: 1, gap: 4 }}>{renderBlocks(item.children, ctx, item.spread !== true)}</View>
          </View>
        );
      })}
    </View>
  );
}

function renderBlock(node: RootContent, ctx: Context, index: number, tight = false): ReactNode {
  const key = nodeKey(index, node);
  const { styles, props, theme } = ctx;
  switch (node.type) {
    case 'paragraph': {
      const only = node.children.length === 1 ? node.children[0] : undefined;
      if (only?.type === 'image' || only?.type === 'imageReference') {
        const url =
          only.type === 'image' ? only.url : (ctx.definitions.get(only.identifier.toLowerCase())?.url ?? '');
        const uri = resolveUrl(url, props.baseUrl);
        if (uri) return <AutoImage alt={only.alt ?? ''} key={key} uri={uri} />;
      }
      return (
        <Text key={key} selectable style={styles.text}>
          {renderInlines(node.children, ctx)}
        </Text>
      );
    }
    case 'heading': {
      const heading = node as Heading;
      return (
        <Text accessibilityRole="header" key={key} selectable style={styles.headings[heading.depth - 1]}>
          {renderInlines(heading.children, ctx)}
        </Text>
      );
    }
    case 'thematicBreak':
      return <View key={key} style={styles.rule} />;
    case 'blockquote':
      return (
        <View key={key} style={styles.quote}>
          {renderBlocks((node as Blockquote).children, ctx)}
        </View>
      );
    case 'list':
      return renderList(node, ctx, key);
    case 'code':
      return renderCode(node, ctx, key);
    case 'table':
      return renderTable(node, ctx, key);
    case 'math': {
      if (props.webView && props.features?.math !== false) {
        let html: string | null = null;
        try {
          html = mathHtml(node.value, theme, props.scripts?.katex);
        } catch {
          html = null;
        }
        if (html) return <RichBlock html={html} key={key} minHeight={theme.lineHeight * 2} webView={props.webView} />;
      }
      return (
        <Text key={key} selectable style={[styles.inlineCode, { textAlign: 'center' }]}>
          {node.value}
        </Text>
      );
    }
    case 'html': {
      const text = htmlToText(node.value);
      return text ? (
        <Text key={key} selectable style={styles.text}>
          {text}
        </Text>
      ) : null;
    }
    default:
      // definition, footnoteDefinition (rendered at the end), yaml, …
      return null;
  }
}

function renderBlocks(nodes: RootContent[], ctx: Context, tight = false): ReactNode[] {
  return nodes.map((node, index) => renderBlock(node, ctx, index, tight));
}

function collect(tree: Nodes, definitions: Map<string, Definition>, footnotes: FootnoteDefinition[]) {
  if (tree.type === 'definition') definitions.set(tree.identifier.toLowerCase(), tree);
  if (tree.type === 'footnoteDefinition') footnotes.push(tree);
  if ('children' in tree) for (const child of tree.children) collect(child as Nodes, definitions, footnotes);
}

/** Order of first reference, so footnotes are numbered as they appear. */
function footnoteOrder(tree: Nodes, order: Map<string, number>) {
  if (tree.type === 'footnoteReference') {
    const id = tree.identifier.toLowerCase();
    if (!order.has(id)) order.set(id, order.size + 1);
  }
  if ('children' in tree) for (const child of tree.children) footnoteOrder(child as Nodes, order);
}

/**
 * React Native Markdown renderer: GFM (tables, task lists, footnotes), Shiki code highlighting,
 * CJK emphasis and streaming repair, drawn with native views. Display math, Mermaid and ECharts are
 * drawn in a WebView when `webView` is passed. Untrusted input is safe: raw HTML is never rendered
 * as HTML, links open only for http(s) / mailto, and WebView content is hardened and sandboxed.
 */
export function MarkdownView(props: MarkdownViewProps) {
  const { children, streaming = false, softBreaks = true, features, colorScheme, theme: overrides, highlighter, style } = props;
  const device = useColorScheme();
  const scheme: ColorScheme = colorScheme ?? (device === 'dark' ? 'dark' : 'light');
  const theme = useMemo(() => resolveTheme(scheme, overrides), [scheme, overrides]);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const tree: Root = useMemo(
    () => parseMarkdown(children, { streaming, softBreaks, cjk: features?.cjk !== false }),
    [children, streaming, softBreaks, features?.cjk],
  );

  const definitions = new Map<string, Definition>();
  const footnoteDefinitions: FootnoteDefinition[] = [];
  collect(tree, definitions, footnoteDefinitions);
  const footnotes = new Map<string, number>();
  footnoteOrder(tree, footnotes);

  const highlight = highlighter === false ? null : (highlighter ?? (defaultHighlighter ??= createCodeHighlighter()));
  const ctx: Context = { theme, scheme, styles, props, definitions, footnotes, highlight };
  const notes = footnoteDefinitions
    .filter((note) => footnotes.has(note.identifier.toLowerCase()))
    .sort((a, b) => footnotes.get(a.identifier.toLowerCase())! - footnotes.get(b.identifier.toLowerCase())!);

  return (
    <View style={[styles.root, style]}>
      {renderBlocks(tree.children, ctx)}
      {notes.length ? (
        <View style={{ gap: 6 }}>
          <View style={styles.rule} />
          {notes.map((note) => (
            <View key={note.identifier} style={styles.row}>
              <Text style={[styles.marker, styles.small]}>{`${footnotes.get(note.identifier.toLowerCase())}.`}</Text>
              <View style={{ flex: 1 }}>{renderBlocks(note.children, ctx, true)}</View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

