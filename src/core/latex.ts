import { rewriteOutsideCode } from './code-segments.ts';

/**
 * Converts LaTeX math delimiters to the `$$` syntax remark-math understands.
 *
 * LLMs usually write `\( … \)` (inline) and `\[ … \]` (display). remark-math ignores those, so the
 * Markdown parser eats the backslashes and `\( E = mc^2 \)` shows as `( E = mc^2 )`.
 *
 * Both map to `$$` (single-`$` math stays off, so currency like "$5 … $10" stays text):
 *   - `\( x \)` → `$$x$$` on one line → inline math;
 *   - `\[ x \]` → `$$` block on its own lines → display math.
 *
 * Only what looks like math is converted: escaped brackets in prose (`\[this\]`) and indexing glued to a word
 * (`arr\[0\]`) stay as written. Code — fenced (``` or ~~~, also while still streaming) and inline — is never touched.
 */
const BLOCK_MATH = /\\\[([\s\S]+?)\\\]/g;
const INLINE_MATH = /\\\(([\s\S]+?)\\\)/g;

/** An operator or command, a short variable (`x`, `ab`, `x'`), or a digit mixed with something else. */
export function looksLikeMath(expr: string): boolean {
  const text = expr.trim();
  if (text === '') return false;
  if (/[\\^_=<>+*/|]/.test(text)) return true;
  if (/^[A-Za-z]{1,2}'?$/.test(text)) return true;
  return /\d/.test(text) && /[A-Za-z(-]/.test(text);
}

function convert(text: string): string {
  const when =
    (render: (expr: string) => string) =>
    (match: string, expr: string, offset: number, whole: string): string => {
      if (/\w/.test(whole[offset - 1] ?? '')) return match;
      return looksLikeMath(expr) ? render(expr.trim()) : match;
    };
  return text
    .replace(BLOCK_MATH, when((expr) => `\n\n$$\n${expr}\n$$\n\n`))
    .replace(INLINE_MATH, when((expr) => `$$${expr}$$`));
}

export function normalizeLatexDelimiters(content: string): string {
  if (!content.includes('\\(') && !content.includes('\\[')) return content;
  return rewriteOutsideCode(content, convert);
}
