'use client';

import { useEffect, useMemo, useState } from 'react';
import { type Components, defaultRehypePlugins, defaultRemarkPlugins, type PluginConfig, Streamdown } from 'streamdown';

import { ROOT_CLASS, SAFE_COMPONENTS } from './components.tsx';
import { featureKey, getCachedMarkdownPlugins, loadMarkdownPlugins, type MarkdownFeatures } from './plugins.ts';
import type { PluggableList } from 'unified';

import { prepareMarkdown } from '../core/parse.ts';
import { ALLOWED_HTML_TAGS, MERMAID_CONFIG, sanitizeMarkdownUrl } from '../core/security.ts';
import { remarkSoftBreaks } from '../core/soft-breaks.ts';
import { rehypeUrlPolicy } from './rehype-url-policy.ts';

/** Tailwind prefix `styles.css` is built with; Streamdown prepends it to its own classes. */
const TAILWIND_PREFIX = 'rlm';

// Passing `remarkPlugins` replaces Streamdown's defaults, so they are spread back in first.
const DEFAULT_REMARK = Object.values(defaultRemarkPlugins);
const REMARK_WITH_SOFT_BREAKS = [...DEFAULT_REMARK, remarkSoftBreaks];
/**
 * Raw HTML is parsed, then sanitized with Streamdown's schema plus {@link ALLOWED_HTML_TAGS} (as Streamdown does for
 * `allowedTags`), then the URL policy runs in place of rehype-harden (see rehype-url-policy.ts).
 */
const [rehypeSanitize, baseSchema] = defaultRehypePlugins.sanitize as [unknown, { tagNames?: string[]; attributes?: Record<string, unknown> }];
const SANITIZE_SCHEMA = {
  ...baseSchema,
  tagNames: [...(baseSchema.tagNames ?? []), ...Object.keys(ALLOWED_HTML_TAGS)],
  attributes: { ...baseSchema.attributes, ...ALLOWED_HTML_TAGS },
};
const REHYPE = [defaultRehypePlugins.raw, [rehypeSanitize, SANITIZE_SCHEMA], rehypeUrlPolicy] as PluggableList;

export interface MarkdownViewProps {
  /** The Markdown source. */
  children: string;
  /** Extra class on the wrapper `<div class="rlm-markdown">`. */
  className?: string;
  /**
   * `true` while the text is still streaming in (LLM output): incomplete Markdown is repaired so a
   * half-written table or code fence does not break the layout, and new words fade in.
   * Default `false`.
   */
  streaming?: boolean;
  /** Turn rich blocks off to skip loading them. All on by default. */
  features?: MarkdownFeatures;
  /** Render a single newline as a line break, like a chat message. Default `true`. */
  softBreaks?: boolean;
  /** Extra element overrides, merged over the built-in safe link / image components. */
  components?: Components;
  /** Tables taller than this scroll inside (px or CSS length; `0` = no limit). Default `300`. */
  tableMaxHeight?: number | string;
  /** Code blocks taller than this scroll inside (px or CSS length; `0` = no limit). Default `400`. */
  codeBlockMaxHeight?: number | string;
  /** Show line numbers in code blocks. Default `true`. */
  lineNumbers?: boolean;
}

/**
 * Renders Markdown written by an LLM or a user: GFM (tables, task lists, footnotes), and — once
 * the browser has loaded them — Shiki code highlighting, KaTeX math, Mermaid diagrams, ECharts
 * charts and CJK-aware emphasis. Sanitized by default; renders on the server as plain Markdown.
 *
 * Import `react-llm-markdown/styles.css` once.
 */
export function MarkdownView({
  children,
  className,
  streaming = false,
  features,
  softBreaks = true,
  components,
  tableMaxHeight = 300,
  codeBlockMaxHeight = 400,
  lineNumbers = true,
}: MarkdownViewProps) {
  const key = featureKey(features);
  const [loaded, setLoaded] = useState<{ key: string; plugins: PluginConfig } | undefined>(() => {
    const plugins = getCachedMarkdownPlugins(key);
    return plugins ? { key, plugins } : undefined;
  });
  const plugins = loaded?.key === key ? loaded.plugins : getCachedMarkdownPlugins(key);

  useEffect(() => {
    if (plugins) return;
    let active = true;
    void loadMarkdownPlugins(key).then((next) => {
      if (active) setLoaded({ key, plugins: next });
    });
    return () => {
      active = false;
    };
  }, [key, plugins]);

  // Streamdown repairs incomplete Markdown itself (parseIncompleteMarkdown), so no `streaming` here.
  const content = useMemo(() => prepareMarkdown(children), [children]);
  const mergedComponents = useMemo(
    () => (components ? { ...SAFE_COMPONENTS, ...components } : SAFE_COMPONENTS),
    [components],
  );

  return (
    <div className={className ? `${ROOT_CLASS} ${className}` : ROOT_CLASS}>
      <Streamdown
        allowedTags={ALLOWED_HTML_TAGS}
        animated={streaming}
        codeBlockMaxHeight={codeBlockMaxHeight}
        components={mergedComponents}
        controls={{
          code: { copy: true, download: false },
          image: false,
          mermaid: { copy: true, download: false, fullscreen: true, panZoom: false },
          table: false,
        }}
        lineNumbers={lineNumbers}
        mermaid={{ config: MERMAID_CONFIG }}
        mode={streaming ? 'streaming' : 'static'}
        parseIncompleteMarkdown={streaming}
        plugins={plugins}
        prefix={TAILWIND_PREFIX}
        rehypePlugins={REHYPE}
        remarkPlugins={softBreaks ? REMARK_WITH_SOFT_BREAKS : DEFAULT_REMARK}
        shikiTheme={['github-light', 'github-dark']}
        tableMaxHeight={tableMaxHeight}
        urlTransform={sanitizeMarkdownUrl}
      >
        {content}
      </Streamdown>
    </div>
  );
}
