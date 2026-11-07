import type { Root } from 'mdast';
import remarkCjkFriendly from 'remark-cjk-friendly';
import remarkCjkFriendlyGfmStrikethrough from 'remark-cjk-friendly-gfm-strikethrough';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remend from 'remend';
import { unified } from 'unified';

import { normalizeLatexDelimiters } from './latex.ts';
import { sanitizeMarkdownUrl, stripMermaidConfigOverrides, stripProtocolRelativeMarkdownLinks } from './security.ts';
import { remarkSoftBreaks } from './soft-breaks.ts';

export interface PrepareOptions {
  /** The text is still streaming in: close unfinished emphasis, code fences, links and tables. */
  streaming?: boolean;
}

/**
 * Source-level preparation shared by every renderer: protocol-relative link destinations become
 * `#`, Mermaid config overrides are removed, LaTeX `\( \)` / `\[ \]` become `$$`, and — while
 * streaming — incomplete Markdown is repaired.
 */
export function prepareMarkdown(source: string, options: PrepareOptions = {}): string {
  const prepared = normalizeLatexDelimiters(
    stripMermaidConfigOverrides(stripProtocolRelativeMarkdownLinks(source)),
  );
  return options.streaming ? remend(stripDanglingMarker(prepared)) : prepared;
}

/**
 * A marker the stream has just opened (`Text **`, `a _`, `` x ` ``, `~~`) has no text yet, so `remend` cannot close it
 * and it would flash as literal characters. It is hidden until its first character arrives.
 */
// Only an opening marker (at the start or after whitespace); `**bold**` ends with a closing one.
const DANGLING_MARKER = /(^|\s)(\*{1,3}|_{1,3}|~{1,2}|`{1,3})[ \t]*$/;

export function stripDanglingMarker(text: string): string {
  return text.replace(DANGLING_MARKER, '$1');
}

export interface ParseOptions extends PrepareOptions {
  /** Render a single newline as a line break. Default `true`. */
  softBreaks?: boolean;
  /** Parse CJK-aware emphasis (`**強調**です`). Default `true`. */
  cjk?: boolean;
}

interface Node {
  type: string;
  url?: string;
  children?: Node[];
}

/**
 * Applies the URL policy to the tree: a link whose URL is refused becomes its plain children; an
 * image or definition whose URL is refused is removed.
 */
function sanitizeUrls(node: Node): void {
  if (!node.children) return;
  const children: Node[] = [];
  for (const child of node.children) {
    sanitizeUrls(child);
    if (child.type === 'link' || child.type === 'image' || child.type === 'definition') {
      const url = sanitizeMarkdownUrl(child.url ?? '');
      if (url === null) {
        if (child.type === 'link') children.push(...(child.children ?? []));
        continue;
      }
      child.url = url;
    }
    children.push(child);
  }
  node.children = children;
}

/**
 * Parses Markdown into an mdast tree (GFM, `$$` math, CJK emphasis) with the shared preparation
 * and the URL policy applied. Raw HTML stays as `html` nodes: renderers must not inject it.
 * DOM-free: used by the React Native renderer, usable anywhere.
 */
export function parseMarkdown(source: string, options: ParseOptions = {}): Root {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath, { singleDollarTextMath: false });
  if (options.cjk !== false) processor.use(remarkCjkFriendly).use(remarkCjkFriendlyGfmStrikethrough);
  const tree = processor.parse(prepareMarkdown(source, options));
  const transformed = processor.runSync(tree) as Root;
  if (options.softBreaks !== false) remarkSoftBreaks()(transformed as never);
  sanitizeUrls(transformed as Node);
  return transformed;
}
