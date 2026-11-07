import { describe, it } from 'node:test';

import { normalizeLatexDelimiters } from '../dist/web/index.js';
import { expect } from './expect.ts';

/**
 * LLMs write math with `\( … \)` and `\[ … \]`, which remark-math does not recognize. Both become
 * `$$` (single-`$` math stays off so currency stays text). Code must never be rewritten.
 */
describe('normalizeLatexDelimiters', () => {
  it('converts inline \\( … \\) to one-line $$…$$ (the E = mc^2 case)', () => {
    expect(normalizeLatexDelimiters('Inline: \\( E = mc^2 \\)')).toBe('Inline: $$E = mc^2$$');
  });

  it('converts block \\[ … \\] to a blank-line-wrapped $$ block (quadratic formula)', () => {
    const input = '\\[ x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a} \\]';
    expect(normalizeLatexDelimiters(input)).toBe(
      '\n\n$$\nx = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}\n$$\n\n',
    );
  });

  it('trims surrounding whitespace including newlines in block math', () => {
    const input = '\\[\nx = y + z\n\\]';
    expect(normalizeLatexDelimiters(input)).toBe('\n\n$$\nx = y + z\n$$\n\n');
  });

  it('handles multiple expressions in one string (inline + block)', () => {
    const input = 'a \\( x \\) b \\[ y \\] c';
    expect(normalizeLatexDelimiters(input)).toBe('a $$x$$ b \n\n$$\ny\n$$\n\n c');
  });

  it('keeps single-dollar currency untouched (not math)', () => {
    const input = 'Invest $5 and later $10, total $15.';
    expect(normalizeLatexDelimiters(input)).toBe(input);
  });

  it('leaves content without LaTeX delimiters untouched (fast path)', () => {
    const input = 'Plain **markdown** with $existing$ math and a (paren).';
    expect(normalizeLatexDelimiters(input)).toBe(input);
  });

  it('does not rewrite delimiters inside a fenced code block', () => {
    const input = '```\n\\( not math \\)\n```';
    expect(normalizeLatexDelimiters(input)).toBe(input);
  });

  it('does not rewrite delimiters inside inline code', () => {
    const input = 'Use `\\(a\\)` verbatim but \\( b \\) is math';
    expect(normalizeLatexDelimiters(input)).toBe('Use `\\(a\\)` verbatim but $$b$$ is math');
  });

  it('leaves an unclosed delimiter (mid-stream) untouched', () => {
    expect(normalizeLatexDelimiters('partial \\( E = mc')).toBe('partial \\( E = mc');
  });
});
