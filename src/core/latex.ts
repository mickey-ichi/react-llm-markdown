import { MARKDOWN_CODE_SEGMENT } from './security.ts';

/**
 * Converts LaTeX math delimiters to the `$$` syntax remark-math understands.
 *
 * LLMs usually write `\( … \)` (inline) and `\[ … \]` (display). remark-math ignores those, so the
 * Markdown parser eats the backslashes and `\( E = mc^2 \)` shows as `( E = mc^2 )`.
 *
 * Both map to `$$` (single-`$` math stays off, so currency like "$5 … $10" stays text):
 *   - `\( x \)` → `$$x$$` on one line → inline math;
 *   - `\[ x \]` → `$$` block on its own lines → display math.
 * Fenced and inline code are never touched.
 */
const BLOCK_MATH = /\\\[([\s\S]+?)\\\]/g;
const INLINE_MATH = /\\\(([\s\S]+?)\\\)/g;

export function normalizeLatexDelimiters(content: string): string {
  if (!content.includes('\\(') && !content.includes('\\[')) return content;
  return content
    .split(MARKDOWN_CODE_SEGMENT)
    .map((segment, index) =>
      index % 2 === 1
        ? segment
        : segment
            .replace(BLOCK_MATH, (_match, expr: string) => `\n\n$$\n${expr.trim()}\n$$\n\n`)
            .replace(INLINE_MATH, (_match, expr: string) => `$$${expr.trim()}$$`),
    )
    .join('');
}
