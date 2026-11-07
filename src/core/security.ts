import { rewriteOutsideCode } from './code-segments.ts';

/**
 * Security defaults for rendering untrusted (LLM- or user-written) Markdown.
 *
 * The web renderer parses raw HTML, then sanitizes it (rehype-raw → rehype-sanitize → rehypeUrlPolicy). Everything here is
 * defense in depth on top of that: a URL protocol allowlist, a short list of extra HTML tags, a
 * locked-down Mermaid config and explicit KaTeX limits.
 */

/** URL protocols permitted on links and images. Everything else is dropped. */
export const ALLOWED_URL_PROTOCOLS = ['http:', 'https:', 'mailto:'] as const;

/**
 * Extra HTML tags allowed through sanitization, keyed to their permitted attributes. Streamdown's
 * default allowlist already covers standard prose tags; these are tags LLMs commonly emit.
 */
export const ALLOWED_HTML_TAGS: Record<string, string[]> = {
  br: [],
  sub: [],
  sup: [],
  mark: [],
  details: [],
  summary: [],
};

/**
 * Mermaid runtime config. `securityLevel: 'strict'` sandboxes the SVG and disables click handlers;
 * `htmlLabels: false` keeps raw HTML out of labels; `maxTextSize` refuses huge sources instead of
 * freezing the page.
 */
export const MERMAID_CONFIG = {
  securityLevel: 'strict',
  startOnLoad: false,
  maxTextSize: 50_000,
  htmlLabels: false,
  flowchart: { htmlLabels: false, curve: 'linear' },
} as const;

/**
 * KaTeX options merged into rehype-katex.
 * - `trust: false`: `\href`, `\url`, `\includegraphics`, `\htmlClass`… render as errors.
 * - `maxExpand: 1000`: a macro-expansion bomb throws instead of hanging.
 * - `maxSize: 20`: no user-specified size above 20em, so a formula cannot cover the page.
 */
export const KATEX_SECURITY_OPTIONS = {
  trust: false,
  maxExpand: 1000,
  maxSize: 20,
} as const;

/**
 * `urlTransform` for Streamdown. Drops dangerous protocols (javascript:, vbscript:, file:, data:)
 * and protocol-relative URLs (`//host`). Relative paths and anchors pass through. `null` drops the
 * attribute.
 */
export function sanitizeMarkdownUrl(url: string): string | null {
  // Browsers drop tab / CR / LF anywhere in a URL and read `\` as `/`, so `java\tscript:` is `javascript:` and
  // `/\evil.example` is `//evil.example`. Decide on the URL as the browser will see it.
  const value = url.trim().replace(/[\t\n\r]/g, '');
  const normalized = value.replace(/\\/g, '/');
  if (normalized === '') return null;

  // `//host` is protocol-relative: treating it as a path would skip the scheme allowlist.
  if (normalized.startsWith('//')) return null;
  if (
    normalized.startsWith('/') ||
    normalized.startsWith('#') ||
    normalized.startsWith('./') ||
    normalized.startsWith('../')
  ) {
    return url;
  }

  // Only a scheme before any '/' counts as a protocol.
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(normalized)?.[1];
  if (!scheme) return url;

  const protocol = `${scheme.toLowerCase()}:`;
  return (ALLOWED_URL_PROTOCOLS as readonly string[]).includes(protocol) ? url : null;
}


/**
 * Inline / image links and reference definitions whose destination is protocol-relative.
 * Streamdown's harden step rewrites `//host/path` to `/path` before `urlTransform` runs, so the
 * allowlist would never see the host. Those destinations become `#` first. Code is left alone.
 */
const PROTOCOL_RELATIVE_INLINE_LINK = /(!?\[[^\]]*\])\((?:\s*<)?\/\/[^)\s>]*(?:\s*>)?\s*\)/g;
const PROTOCOL_RELATIVE_LINK_DEF = /^(\s*\[[^\]]+\]:\s*)\/\/\S+/gm;

export function stripProtocolRelativeMarkdownLinks(content: string): string {
  if (!content.includes('//')) return content;
  return rewriteOutsideCode(content, (text) =>
    text.replace(PROTOCOL_RELATIVE_INLINE_LINK, '$1(#)').replace(PROTOCOL_RELATIVE_LINK_DEF, '$1#'),
  );
}

/**
 * Mermaid config overrides inside a diagram: `%%{init: …}%%` directives and a leading `---`
 * frontmatter block. Mermaid protects `securityLevel` from directives (its `secure` list), but not `htmlLabels`, so a directive
 * could turn HTML labels back on.
 */
const MERMAID_FENCE =
  /(^|\n)(\s*(`{3,}|~{3,})\s*mermaid[^\n]*\n)([\s\S]*?)(\n\s*\3[^\S\n]*(?=\n|$)|$)/g;
const MERMAID_DIRECTIVE = /%%\{[\s\S]*?\}%%/g;
const MERMAID_FRONTMATTER = /^\s*---\n[\s\S]*?\n---[^\S\n]*(\n|$)/;

/**
 * Removes directives and frontmatter from a diagram source. Repeats until stable, so a directive
 * reassembled around a removed one (`%%%%{x}%%{init: …}%%`) and a dangling `%%{` go too.
 */
export function stripMermaidSourceOverrides(source: string): string {
  let out = source;
  for (let previous = ''; previous !== out; ) {
    previous = out;
    out = out.replace(MERMAID_FRONTMATTER, '').replace(MERMAID_DIRECTIVE, '');
    if (out === previous) out = out.replaceAll('%%{', '');
  }
  return out;
}

/** Applies {@link stripMermaidSourceOverrides} to every mermaid fence in a Markdown document. */
export function stripMermaidConfigOverrides(content: string): string {
  if (!content.includes('mermaid')) return content;
  return content.replace(
    MERMAID_FENCE,
    (_match, lead: string, open: string, _fence: string, body: string, close: string) =>
      `${lead}${open}${stripMermaidSourceOverrides(body)}${close}`,
  );
}
