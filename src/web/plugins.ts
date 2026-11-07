import type { DiagramPlugin } from '@streamdown/mermaid';
import type { PluginConfig } from 'streamdown';

import { KATEX_SECURITY_OPTIONS, stripMermaidSourceOverrides } from '../core/security.ts';

/** Rich-block features. Each one is loaded on demand in the browser; all default to on. */
export interface MarkdownFeatures {
  /** Syntax highlighting with Shiki (github-light / github-dark). */
  code?: boolean;
  /** KaTeX math (`$$…$$`, `\(…\)`, `\[…\]`). */
  math?: boolean;
  /** Mermaid diagrams. */
  mermaid?: boolean;
  /** ```echarts / ```chart fences rendered as ECharts charts. */
  echarts?: boolean;
  /** CJK-aware emphasis (`**強調**です`). */
  cjk?: boolean;
}

type FeatureName = keyof MarkdownFeatures;
const FEATURE_NAMES: readonly FeatureName[] = ['code', 'math', 'mermaid', 'echarts', 'cjk'];

/** The feature names that are on, as a stable cache key (`"code,math,…"`). */
export function featureKey(features: MarkdownFeatures = {}): string {
  return FEATURE_NAMES.filter((name) => features[name] !== false).join(',');
}

const cache = new Map<string, PluginConfig>();
const loading = new Map<string, Promise<PluginConfig>>();

/** Plugins already loaded for this feature set, so a second view does not flash a plain layout. */
export function getCachedMarkdownPlugins(key: string): PluginConfig | undefined {
  return cache.get(key);
}

/**
 * Loads the heavy plugins (Shiki, KaTeX, Mermaid, CJK, ECharts) with dynamic imports, so they stay
 * out of the initial bundle and out of SSR. Until they resolve, the view renders plain Markdown.
 */
export function loadMarkdownPlugins(key: string): Promise<PluginConfig> {
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);
  let pending = loading.get(key);
  if (!pending) {
    pending = loadPlugins(new Set(key.split(','))).then((plugins) => {
      cache.set(key, plugins);
      return plugins;
    });
    loading.set(key, pending);
  }
  return pending;
}

async function loadPlugins(on: Set<string>): Promise<PluginConfig> {
  const [codeMod, mathMod, mermaidMod, cjkMod, echartsMod] = await Promise.all([
    on.has('code') ? import('@streamdown/code') : undefined,
    on.has('math') ? import('@streamdown/math') : undefined,
    on.has('mermaid') ? import('@streamdown/mermaid') : undefined,
    on.has('cjk') ? import('@streamdown/cjk') : undefined,
    on.has('echarts') ? import('./echarts-block.tsx') : undefined,
  ]);
  const plugins: PluginConfig = {};
  if (codeMod) plugins.code = codeMod.createCodePlugin({ themes: ['github-light', 'github-dark'] });
  // Single-`$` math stays off so currency ("$5 … $10") is text; see latex.ts.
  if (mathMod) plugins.math = withKatexSecurity(mathMod.createMathPlugin({ singleDollarTextMath: false }));
  if (mermaidMod) plugins.mermaid = withMermaidSourceGuard(mermaidMod.createMermaidPlugin());
  if (cjkMod) plugins.cjk = cjkMod.createCjkPlugin();
  if (echartsMod) plugins.renderers = [{ component: echartsMod.EChartsBlock, language: ['echarts', 'chart'] }];
  return plugins;
}

/**
 * `@streamdown/math` only forwards `errorColor` to rehype-katex. Rebuilds its rehype tuple with
 * {@link KATEX_SECURITY_OPTIONS} so `trust` / `maxExpand` / `maxSize` reach KaTeX explicitly.
 */
export function withKatexSecurity<T extends { rehypePlugin: unknown }>(plugin: T): T {
  const [rehypeKatex, options] = Array.isArray(plugin.rehypePlugin)
    ? (plugin.rehypePlugin as [unknown, unknown?])
    : [plugin.rehypePlugin, {}];
  return {
    ...plugin,
    rehypePlugin: [
      rehypeKatex,
      { ...(options as Record<string, unknown> | undefined), ...KATEX_SECURITY_OPTIONS },
    ] as T['rehypePlugin'],
  };
}

/**
 * Streamdown renders every diagram (inline, fullscreen, export) through
 * `getMermaid(config).render(id, code)`. Wrapping `render` strips `%%{init}%%` directives and
 * frontmatter from the exact code Mermaid parses, wherever the fence sat (blockquotes, lists).
 */
export function withMermaidSourceGuard(plugin: DiagramPlugin): DiagramPlugin {
  return {
    ...plugin,
    getMermaid(config) {
      const mermaid = plugin.getMermaid(config);
      return {
        initialize: (next) => mermaid.initialize(next),
        render: (id, source) => mermaid.render(id, stripMermaidSourceOverrides(source)),
      };
    },
  };
}
