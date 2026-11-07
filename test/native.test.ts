// React Native renderer, with react-native replaced by test/stubs/react-native.ts.
// Needs `node --experimental-test-module-mocks` (see the npm test script).
import { before, beforeEach, describe, it, mock } from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import * as stub from './stubs/react-native.ts';
import { expect } from './expect.ts';

mock.module('react-native', { namedExports: stub });

type Native = typeof import('../dist/native/index.js');
let native: Native;

before(async () => {
  native = await import('../dist/native/index.js');
});

beforeEach(() => {
  stub.rendered.length = 0;
  stub.opened.length = 0;
});

type Props = Parameters<Native['MarkdownView']>[0];
const render = (children: string, props: Omit<Props, 'children'> = {}) =>
  renderToStaticMarkup(createElement(native.MarkdownView, { ...props, children }));
const links = () => stub.rendered.filter((node) => node.type === 'Text' && node.props.accessibilityRole === 'link');

/** A fake WebView that records the HTML it was given. */
function fakeWebView() {
  const pages: string[] = [];
  const WebView = (props: { source: { html: string } }) => {
    pages.push(props.source.html);
    return createElement('rn-webview');
  };
  return { WebView, pages };
}

describe('native MarkdownView: content', () => {
  it('renders headings, emphasis, lists, task lists and quotes', () => {
    const html = render(['# Title', '', 'Some **bold** and _em_ and ~~gone~~.', '', '- one', '- [x] done', '- [ ] todo', '', '> quoted'].join('\n'));
    expect(html).toContain('Title');
    expect(html).toContain('bold');
    expect(html).toContain('☑');
    expect(html).toContain('☐');
    expect(html).toContain('quoted');
    expect(stub.rendered.some((n) => n.props.accessibilityRole === 'header')).toBe(true);
    expect(stub.rendered.some((n) => (n.props.style as { fontWeight?: string } | undefined)?.fontWeight === '700')).toBe(true);
  });

  it('renders a GFM table with header row and alignment', () => {
    const html = render(['| Name | Value |', '|---|---:|', '| a | 1 |'].join('\n'));
    expect(html).toContain('Name');
    expect(html).not.toContain('|---');
    expect(stub.rendered.some((n) => (n.props.style as { textAlign?: string } | undefined)?.textAlign === 'right')).toBe(true);
  });

  it('numbers ordered lists from their start', () => {
    const html = render(['3. three', '4. four'].join('\n'));
    expect(html).toContain('3.');
    expect(html).toContain('4.');
  });

  it('highlights code with Shiki, or shows it plain with highlighter: false', () => {
    render('```ts\nconst x: number = 1;\n```');
    const colored = stub.rendered.filter((n) => n.type === 'Text' && typeof (n.props.style as { color?: string } | undefined)?.color === 'string');
    expect(colored.length > 3).toBe(true);
    const plain = render('```ts\nconst x = 1;\n```', { highlighter: false });
    expect(plain).toContain('const x = 1;');
  });

  it('shows a Copy button only when onCopyCode is given', () => {
    const copied: string[] = [];
    expect(render('```\nx\n```')).not.toContain('Copy');
    render('```\nabc\n```', { onCopyCode: (code) => copied.push(code) });
    const button = stub.rendered.find((n) => n.type === 'Pressable');
    (button?.props.onPress as () => void)();
    expect(copied).toEqual(['abc']);
  });

  it('numbers footnotes in reference order and lists them at the end', () => {
    const html = render(['A[^b] and B[^a].', '', '[^a]: note a', '[^b]: note b'].join('\n'));
    expect(html.indexOf('note b') < html.indexOf('note a')).toBe(true);
    expect(html).toContain('[1]');
    expect(html).toContain('[2]');
  });

  it('repairs incomplete Markdown while streaming', () => {
    render('Hello **wor', { streaming: true });
    expect(stub.rendered.some((n) => (n.props.style as { fontWeight?: string } | undefined)?.fontWeight === '700')).toBe(true);
  });

  it('uses the dark theme when asked', () => {
    render('text', { colorScheme: 'dark' });
    expect(stub.rendered.some((n) => (n.props.style as { color?: string } | undefined)?.color === native.DARK_THEME.foreground)).toBe(true);
  });
});

describe('native MarkdownView: safety', () => {
  it('never renders raw HTML as markup and drops script contents', () => {
    const html = render('<script>alert(1)</script>\n\n<div onclick="x()">Hello <b>there</b></div>');
    expect(html).not.toContain('alert(1)');
    expect(html).not.toContain('onclick');
    expect(html).toContain('Hello there');
  });

  it('honors inline <mark>, <sup> and <br>', () => {
    const html = render('a <mark>hi</mark> b<br>c');
    expect(html).toContain('hi');
    expect(stub.rendered.some((n) => (n.props.style as { backgroundColor?: string } | undefined)?.backgroundColor === native.LIGHT_THEME.markBackground)).toBe(true);
  });

  it('drops javascript:, data: and protocol-relative links and images', () => {
    render('[a](javascript:alert(1)) [b](//evil.example/x) ![c](data:image/png;base64,AAAA)');
    expect(links()).toHaveLength(0);
    expect(stub.rendered.some((n) => n.type === 'Image')).toBe(false);
  });

  it('opens http(s) links, resolves relative ones only with a baseUrl', () => {
    render('[abs](https://example.com/a) [rel](docs/b.md)');
    for (const link of links()) (link.props.onPress as () => void)();
    expect(stub.opened).toEqual(['https://example.com/a']);

    stub.rendered.length = 0;
    render('[rel](docs/b.md)', { baseUrl: 'https://example.com/root/' });
    (links()[0]?.props.onPress as () => void)();
    expect(stub.opened.at(-1)).toBe('https://example.com/root/docs/b.md');
  });

  it('lets onLinkPress stop the default', () => {
    const pressed: string[] = [];
    render('[x](https://example.com)', { onLinkPress: (url) => (pressed.push(url), false) });
    (links()[0]?.props.onPress as () => void)();
    expect(pressed).toEqual(['https://example.com']);
    expect(stub.opened).toHaveLength(0);
  });

  it('renders a block image with a resolved https URL', () => {
    render('![logo](https://example.com/logo.png)');
    const image = stub.rendered.find((n) => n.type === 'Image');
    expect((image?.props.source as { uri: string }).uri).toBe('https://example.com/logo.png');
  });
});

describe('native MarkdownView: WebView blocks', () => {
  const doc = ['$$', 'E = mc^2', '$$', '', '```mermaid', '%%{init: {"securityLevel": "loose"}}%%', 'graph TD; A-->B;', '```', '', '```echarts', '{"title":{"text":"T","link":"javascript:alert(1)"},"series":[{"type":"bar","data":[1,2]}]}', '```'].join('\n');

  it('shows the source of math, Mermaid and ECharts without a WebView', () => {
    const html = render(doc);
    expect(html).toContain('E = mc^2');
    expect(html).toContain('graph TD');
    expect(html).toContain('&quot;series&quot;');
  });

  it('renders them in a hardened WebView when one is passed', () => {
    const { WebView, pages } = fakeWebView();
    render(doc, { webView: WebView });
    expect(pages).toHaveLength(3);
    const [math, mermaid, chart] = pages as [string, string, string];
    expect(math).toContain('<math');
    expect(mermaid).not.toContain('securityLevel\\":\\"loose');
    expect(mermaid).not.toContain('%%{');
    expect(mermaid).toContain(native.MERMAID_SCRIPT.integrity!);
    expect(chart).not.toContain('javascript:');
    expect(chart).toContain('"type":"bar"');
    for (const page of pages) expect(page).toContain("Content-Security-Policy");
  });

  it('falls back to the source for an invalid chart or while streaming', () => {
    const { WebView, pages } = fakeWebView();
    render('```echarts\nnot json\n```', { webView: WebView });
    render('```echarts\n{"series":[]}\n```', { webView: WebView, streaming: true });
    expect(pages).toHaveLength(0);
  });

  it('respects features: false', () => {
    const { WebView, pages } = fakeWebView();
    render(doc, { webView: WebView, features: { math: false, mermaid: false, echarts: false } });
    expect(pages).toHaveLength(0);
  });
});

describe('WebView documents', () => {
  it('embeds data as script-safe JSON', () => {
    expect(native.jsonForScript({ a: '</script><script>alert(1)</script>' })).not.toContain('</script>');
  });

  it('renders math with trust off', () => {
    const html = native.mathHtml('\\href{javascript:alert(1)}{x}', native.LIGHT_THEME);
    expect(html).not.toContain('href="javascript');
  });

  it('allows only the document itself to load', () => {
    expect(native.allowWebViewRequest({ url: 'about:blank' })).toBe(true);
    expect(native.allowWebViewRequest({ url: 'https://evil.example' })).toBe(false);
  });

  it('converts hex theme colors for the chart theme', () => {
    expect(native.toRgb('#fafafa')).toBe('rgb(250, 250, 250)');
    expect(native.toRgb('#fff')).toBe('rgb(255, 255, 255)');
    expect(native.toRgb('red')).toBe('red');
  });
});
