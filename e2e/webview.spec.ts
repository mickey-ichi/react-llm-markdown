// The documents react-llm-markdown/native loads into react-native-webview, run in a real browser on a phone viewport:
// the scripts come from the pinned CDN URLs with Subresource Integrity, as in the app, and `ReactNativeWebView` is
// stubbed to record what the page reports back.
import { expect, type Page, test } from '@playwright/test';

import { echartsHtml, mathHtml, MERMAID_SCRIPT, mermaidHtml } from '../dist/native/webview-html.js';
import { DARK_THEME, LIGHT_THEME } from '../dist/native/theme.js';
import { SECURITY_CASES } from './cases.ts';

async function load(page: Page, html: string) {
  const errors: string[] = [];
  page.on('dialog', (dialog) => {
    errors.push(`dialog: ${dialog.message()}`);
    void dialog.dismiss();
  });
  await page.addInitScript(() => {
    const w = window as unknown as { __messages: unknown[]; ReactNativeWebView: { postMessage(data: string): void } };
    w.__messages = [];
    w.ReactNativeWebView = { postMessage: (data) => w.__messages.push(JSON.parse(data)) };
  });
  await page.goto('about:blank');
  await page.setContent(html, { waitUntil: 'load' });
  const heights = () => page.evaluate(() => (window as unknown as { __messages: { height: number }[] }).__messages.map((m) => m.height));
  const pwned = () => page.evaluate(() => (window as { __pwned?: unknown }).__pwned);
  return { errors, heights, pwned };
}

test('Mermaid draws the diagram and reports its height', async ({ page }) => {
  const { errors, heights } = await load(page, mermaidHtml('flowchart LR\n  A[Start] --> B{OK?}\n  B -- Yes --> C[Done]', LIGHT_THEME, false));
  await expect(page.locator('#o svg[aria-roledescription^="flowchart"]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('#o')).toContainText('Start');
  await expect.poll(async () => Math.max(0, ...(await heights()))).toBeGreaterThan(40);
  expect(errors).toEqual([]);
});

test('Mermaid ignores config overrides and keeps labels as text', async ({ page }) => {
  const source = [
    '%%{init: {"securityLevel": "loose", "flowchart": {"htmlLabels": true}}}%%',
    'flowchart LR',
    `  X["<img src=x onerror=window.__pwned='mermaid'>"] --> Y`,
    '  click Y call alert(1)',
  ].join('\n');
  const { errors, pwned } = await load(page, mermaidHtml(source, DARK_THEME, true));
  await expect(page.locator('#o svg, #o:not(:empty)').first()).toBeVisible({ timeout: 20_000 });
  await page.locator('#o').click();
  await page.waitForTimeout(300);
  expect(await pwned()).toBeUndefined();
  await expect(page.locator('#o img, #o foreignObject')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a tampered script is refused (SRI) and the source is shown instead', async ({ page }) => {
  const tampered = { ...MERMAID_SCRIPT, integrity: 'sha384-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' };
  await load(page, mermaidHtml('graph TD; A-->B;', LIGHT_THEME, false, tampered));
  await expect(page.locator('#o')).toHaveText('graph TD; A-->B;', { timeout: 20_000 });
  await expect(page.locator('#o svg')).toHaveCount(0);
});

test('ECharts draws the chart at the theme height, without HTML from the option', async ({ page }) => {
  const option = {
    title: { text: 'Sales', link: "javascript:window.__pwned='title'" },
    tooltip: { trigger: 'axis', formatter: "<img src=x onerror=window.__pwned='tooltip'>{b}" },
    xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed'] },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: [5, 20, 36] }],
  };
  const { errors, heights, pwned } = await load(page, echartsHtml(JSON.stringify(option), LIGHT_THEME));
  const canvas = page.locator('#c canvas');
  await expect(canvas).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => Math.max(0, ...(await heights()))).toBeGreaterThanOrEqual(LIGHT_THEME.chartHeight);
  const box = (await canvas.boundingBox())!;
  for (const x of [0.3, 0.5, 0.7]) await page.mouse.move(box.x + box.width * x, box.y + box.height * 0.6);
  await page.mouse.click(box.x + box.width / 2, box.y + 12); // the title
  await page.waitForTimeout(300);
  expect(await pwned()).toBeUndefined();
  expect(page.url()).toBe('about:blank');
  expect(errors).toEqual([]);
});

test('display math renders as MathML and \\href stays inert', async ({ page }) => {
  const { heights } = await load(page, mathHtml('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', LIGHT_THEME));
  await expect(page.locator('math mfrac').first()).toBeAttached();
  await expect.poll(async () => Math.max(0, ...(await heights()))).toBeGreaterThan(20);

  await load(page, mathHtml("\\href{javascript:window.__pwned='katex'}{click}", LIGHT_THEME));
  await expect(page.locator('a')).toHaveCount(0);
});

test('the CSP blocks scripts from any other origin', async ({ page }) => {
  const html = mathHtml('x', LIGHT_THEME).replace('</body>', `<script src="https://unpkg.com/react@19/umd/react.production.min.js"></script><script>window.__inline='ran'</script></body>`);
  const blocked: string[] = [];
  page.on('console', (message) => {
    if (/Content Security Policy/i.test(message.text())) blocked.push(message.text());
  });
  await load(page, html);
  await page.waitForTimeout(500);
  expect(blocked.length).toBeGreaterThan(0);
  expect(await page.evaluate(() => typeof (window as { React?: unknown }).React)).toBe('undefined');
});

// Every security payload that reaches a WebView on a device (ECharts, Mermaid, display math), in the exact document
// react-llm-markdown/native would load, with its CDN scripts.
test.describe('security payloads in WebView documents', () => {
  type Block = { kind: 'echarts' | 'mermaid' | 'math'; source: string };

  async function blocksOf(markdown: string): Promise<Block[]> {
    const { parseMarkdown } = await import('../dist/core/index.js');
    const blocks: Block[] = [];
    const walk = (node: { type: string; lang?: string | null; value?: string; children?: unknown[] }) => {
      if (node.type === 'code' && (node.lang === 'echarts' || node.lang === 'chart')) blocks.push({ kind: 'echarts', source: node.value! });
      if (node.type === 'code' && node.lang === 'mermaid') blocks.push({ kind: 'mermaid', source: node.value! });
      if (node.type === 'math') blocks.push({ kind: 'math', source: node.value! });
      for (const child of (node.children ?? []) as (typeof node)[]) walk(child);
    };
    walk(parseMarkdown(markdown) as never);
    return blocks;
  }

  for (const item of SECURITY_CASES) {
    test(`${item.id} ${item.title}`, async ({ page }) => {
      const blocks = await blocksOf(item.markdown);
      test.skip(blocks.length === 0, 'no WebView block in this payload');
      for (const block of blocks) {
        let html: string;
        try {
          html =
            block.kind === 'echarts'
              ? echartsHtml(block.source, LIGHT_THEME)
              : block.kind === 'mermaid'
                ? mermaidHtml(block.source, LIGHT_THEME, false)
                : mathHtml(block.source, LIGHT_THEME);
        } catch {
          continue; // refused before any WebView: the app shows the source as text
        }
        const evil: string[] = [];
        await page.route('**/*evil.example*/**', (route) => {
          evil.push(route.request().url());
          return route.abort();
        });
        const { errors } = await load(page, html);
        const target = page.locator('#c, #o, .m').first();
        await expect(target).toBeVisible({ timeout: 20_000 });
        await page.waitForTimeout(block.kind === 'math' ? 100 : 1_000);
        const box = (await target.boundingBox())!;
        for (const [x, y] of [[0.3, 0.6], [0.5, 0.5], [0.7, 0.6], [0.5, 0.05], [0.5, 0.1]]) {
          await page.mouse.move(box.x + box.width * x!, box.y + box.height * y!);
          await page.mouse.click(box.x + box.width * x!, box.y + box.height * y!);
        }
        for (const link of await page.locator('a, .node').all()) await link.click({ timeout: 1_000 }).catch(() => undefined);
        await page.waitForTimeout(200);
        expect(await page.evaluate(() => (window as { __xss?: unknown }).__xss)).toBeUndefined();
        expect(evil).toEqual([]);
        expect(errors).toEqual([]);
        expect(page.url()).toBe('about:blank');
        await expect(page.locator('#o img, #o foreignObject, a[href^="javascript:"]')).toHaveCount(0);
      }
    });
  }
});
