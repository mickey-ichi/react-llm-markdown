import { describe, it } from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { EChartsBlock, MarkdownView } from '../dist/web/index.js';
import { expect } from './expect.ts';

/**
 * Server render of the built package. The rich plugins (Shiki, KaTeX, Mermaid, ECharts) load only
 * in the browser, so SSR exercises the base pipeline: it must render plain Markdown and never throw.
 */
const render = (content: string, props: { streaming?: boolean; softBreaks?: boolean } = {}) =>
  renderToStaticMarkup(createElement(MarkdownView, { ...props, children: content }));

describe('MarkdownView (SSR)', () => {
  it('wraps the output in .rlm-markdown and uses the rlm: Tailwind prefix', () => {
    const html = render('# Title', { streaming: false });
    expect(html).toMatch(/^<div class="rlm-markdown">/);
    expect(html).toMatch(/class="[^"]*rlm:/);
    expect(renderToStaticMarkup(createElement(MarkdownView, { className: 'chat', children: 'x' }))).toMatch(
      /^<div class="rlm-markdown chat">/,
    );
  });

  it('renders a GFM table as HTML, not raw pipe text', () => {
    const md = ['| 曜日 | 天気 |', '| --- | --- |', '| 月 | 晴れ |'].join('\n');
    const html = render(md);
    expect(html).toContain('<table');
    expect(html).toContain('晴れ');
    expect(html).not.toContain('| 曜日 | 天気 |');
  });

  it('renders headings, emphasis and lists', () => {
    const html = render(['# Title', '', '- **bold** item', '- *em* item'].join('\n'));
    expect(html).toContain('<h1');
    expect(html).toContain('data-streamdown="strong"');
    expect(html).toContain('<li');
  });

  it('renders a blockquote and a divider', () => {
    const html = render(['> Quote', '', '---'].join('\n'));
    expect(html).toContain('<blockquote');
    expect(html).toContain('<hr');
  });

  it('renders fenced-code headers with a copy control', () => {
    const html = render(['```javascript', 'console.log("hello");', '```'].join('\n'));
    expect(html).toContain('data-streamdown="code-block-header"');
    expect(html).toContain('data-streamdown="code-block-copy-button"');
    expect(html).toContain('javascript');
  });

  it('renders the ECharts header with a source-copy control', () => {
    const code = '{"xAxis":{},"yAxis":{},"series":[]}';
    const html = renderToStaticMarkup(createElement(EChartsBlock, { code, isIncomplete: false, language: 'echarts' }));
    expect(html).toContain('data-rlm-block-header="echarts"');
    expect(html).toContain('ECharts');
    expect(html).toContain('data-streamdown="code-block-copy-button"');
  });

  it('shows the ECharts source while the fence is still streaming or invalid', () => {
    const incomplete = renderToStaticMarkup(
      createElement(EChartsBlock, { code: '{"series":[', isIncomplete: true, language: 'echarts' }),
    );
    expect(incomplete).toContain('data-rlm-block-body="echarts-source"');
    const invalid = renderToStaticMarkup(
      createElement(EChartsBlock, { code: 'not json', isIncomplete: false, language: 'echarts' }),
    );
    expect(invalid).toContain('not json');
  });

  it('does not crash on math, mermaid or echarts fences', () => {
    const md = [
      '$$E = mc^2$$',
      '',
      '```mermaid',
      'graph TD; A-->B;',
      '```',
      '',
      '```echarts',
      '{"series":[{"type":"bar","data":[1,2,3]}]}',
      '```',
    ].join('\n');
    expect(() => render(md)).not.toThrow();
    expect(() => render(md, { streaming: true })).not.toThrow();
  });

  it('renders both streaming and static modes', () => {
    expect(render('**hi** there', { streaming: true })).toContain('hi');
    expect(render('**hi** there', { streaming: false })).toContain('data-streamdown="strong"');
  });

  it('renders a single newline as a line break by default', () => {
    const html = render(['これは1行目です。', 'これは2行目です。'].join('\n'));
    expect(html).toMatch(/これは1行目です。<br\/?>\s*これは2行目です。/);
  });

  it('keeps standard Markdown line joining with softBreaks: false', () => {
    const html = render(['line one', 'line two'].join('\n'), { softBreaks: false });
    expect(html).not.toContain('<br');
  });

  it('keeps tables, code and paragraph gaps intact with soft breaks on', () => {
    const md = ['intro line', '| a | b |', '| - | - |', '| 1 | 2 |', '', '```python', 'x = 1', 'y = 2', '```', '', 'next paragraph'].join(
      '\n',
    );
    const html = render(md);
    expect(html).toContain('<table');
    expect(html).not.toContain('| a | b |');
    const codeBody = html.slice(html.indexOf('data-streamdown="code-block-body"'));
    expect(codeBody).toContain('x = 1');
    expect(codeBody).toContain('y = 2');
    expect(codeBody.slice(0, codeBody.indexOf('</pre>'))).not.toContain('<br');
    expect(html).toContain('next paragraph');
  });

  it('keeps footnote anchors in the view and their target ids', () => {
    const html = render(['本文[^1]です。', '', '[^1]: 脚注です。'].join('\n'));
    expect(html).toContain('href="#user-content-fn-1"');
    expect(html).toContain('id="user-content-fnref-1"');
    expect(html).toContain('id="user-content-fn-1"');
    expect(html).toContain('href="#user-content-fnref-1"');
    const refAnchor = html.slice(html.indexOf('<a', html.indexOf('本文')), html.indexOf('</a>'));
    expect(refAnchor).not.toContain('target="_blank"');
  });

  it('opens external links in a new tab without a referrer', () => {
    const html = render('[Example](https://example.com)');
    expect(html).toContain('class="rlm-link"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(html).toContain('referrerPolicy="no-referrer"');
  });

  it('keeps relative links exactly as written (docs/page.md, ../x.md)', () => {
    const html = render('[docs](docs/page.md) [up](../x.md) [js](javascript:alert(1))');
    expect(html).toContain('href="docs/page.md"');
    expect(html).toContain('href="../x.md"');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('[blocked]');
    // A refused link is plain text, not an <a> that looks clickable.
    expect(html).toMatch(/<span>js<\/span>/);
  });

  it('accepts extra component overrides', () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownView, { components: { hr: () => createElement('hr', { className: 'custom' }) }, children: '---' }),
    );
    expect(html).toContain('class="custom"');
  });
});
