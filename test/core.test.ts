import { describe, it } from 'node:test';

import { parseMarkdown, prepareMarkdown, stripDanglingMarker } from '../dist/core/index.js';
import { expect } from './expect.ts';

type Node = { type: string; url?: string; value?: string; children?: Node[] };

function find(tree: Node, type: string): Node[] {
  const out: Node[] = [];
  const walk = (node: Node) => {
    if (node.type === type) out.push(node);
    node.children?.forEach(walk);
  };
  walk(tree);
  return out;
}

describe('core: parseMarkdown', () => {
  it('parses GFM, math and footnotes into mdast', () => {
    const tree = parseMarkdown(['| a |', '|---|', '| 1 |', '', '- [x] t', '', '$$', 'x^2', '$$', '', 'n[^1]', '', '[^1]: f'].join('\n')) as Node;
    expect(find(tree, 'table')).toHaveLength(1);
    expect(find(tree, 'math')).toHaveLength(1);
    expect(find(tree, 'footnoteDefinition')).toHaveLength(1);
  });

  it('turns \\( \\) into inline math and keeps currency as text', () => {
    const tree = parseMarkdown('Area \\( \\pi r^2 \\) costs $5 or $10') as Node;
    expect(find(tree, 'inlineMath')[0]?.value).toBe('\\pi r^2');
    expect(find(tree, 'text').map((n) => n.value).join('')).toContain('$5 or $10');
  });

  it('applies the URL policy: refused links keep their text, refused images go', () => {
    const tree = parseMarkdown('[a](javascript:x) [b](https://ok.example) ![c](data:image/png;base64,AA) [d](//evil.example)') as Node;
    expect(find(tree, 'link').map((n) => n.url)).toEqual(['https://ok.example', '#']);
    expect(find(tree, 'image')).toHaveLength(0);
    expect(find(tree, 'text').map((n) => n.value).join('')).toContain('a');
  });

  it('applies the URL policy to reference definitions', () => {
    const tree = parseMarkdown('[x][r]\n\n[r]: javascript:alert(1)') as Node;
    expect(find(tree, 'definition')).toHaveLength(0);
  });

  it('soft breaks are on by default and can be turned off', () => {
    expect(find(parseMarkdown('a\nb') as Node, 'break')).toHaveLength(1);
    expect(find(parseMarkdown('a\nb', { softBreaks: false }) as Node, 'break')).toHaveLength(0);
  });

  it('parses CJK-aware emphasis', () => {
    expect(find(parseMarkdown('**「強調」**です') as Node, 'strong')).toHaveLength(1);
  });
});

describe('core: prepareMarkdown', () => {
  it('repairs incomplete Markdown only while streaming', () => {
    expect(prepareMarkdown('**bold')).toBe('**bold');
    expect(prepareMarkdown('**bold', { streaming: true })).toBe('**bold**');
  });

  it('hides a marker the stream opened but has not filled yet', () => {
    for (const [input, output] of [
      ['Streaming **', 'Streaming '],
      ['a _', 'a '],
      ['x `', 'x '],
      ['y ~~', 'y '],
      ['```', ''],
      ['done **bold**', 'done **bold**'],
      ['escaped \\*', 'escaped \\*'],
    ]) {
      expect(stripDanglingMarker(input!)).toBe(output);
    }
    expect(prepareMarkdown('Streaming **', { streaming: true }).trimEnd()).toBe('Streaming');
    expect(prepareMarkdown('Static **')).toBe('Static **');
  });

  it('removes Mermaid config overrides', () => {
    expect(prepareMarkdown('```mermaid\n%%{init: {}}%%\ngraph TD\n```')).not.toContain('%%{');
  });
});
