// React Native E2E: the Expo example app (example/App.tsx), built for the web by scripts/build-example.mjs, so the
// native renderer (react-llm-markdown/native, through react-native-web) runs in a real browser on a phone viewport.
// react-native-webview has no web implementation, so math / Mermaid / ECharts take their no-WebView path here;
// webview.spec.ts covers the WebView documents themselves.
import { existsSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';

import { expect, type Page, test } from '@playwright/test';

const DIST = join(import.meta.dirname, '..', 'example', 'dist-web');
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ico': 'image/x-icon', '.json': 'application/json' };

let server: Server;
let base: string;

test.beforeAll(async () => {
  if (!existsSync(join(DIST, 'index.html'))) throw new Error('example/dist-web is missing: run `node scripts/build-example.mjs`');
  server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    const file = join(DIST, path);
    const target = existsSync(file) && !file.endsWith('/') && extname(file) ? file : join(DIST, 'index.html');
    res.writeHead(200, { 'content-type': TYPES[extname(target)] ?? 'application/octet-stream' });
    res.end(readFileSync(target));
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

test.afterAll(async () => {
  await new Promise((done) => server.close(done));
});

async function open(page: Page) {
  const errors: string[] = [];
  page.on('dialog', (dialog) => {
    errors.push(`dialog: ${dialog.message()}`);
    void dialog.dismiss();
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  await page.goto(base);
  await expect(page.getByTestId('doc')).toContainText('Native demo');
  return errors;
}

test('renders the document with native views', async ({ page }) => {
  const errors = await open(page);
  const doc = page.getByTestId('doc');
  await expect(doc.getByRole('heading', { name: 'Native demo' })).toBeVisible();
  for (const text of ['alpha', '22', '1.', '2.', '☑', '☐', 'A quote.', 'highlight', 'The footnote.', '[1]', 'E = mc^2']) {
    await expect(doc).toContainText(text);
  }
  // Raw table syntax and emphasis markers never show.
  await expect(doc).not.toContainText('|---');
  await expect(doc).not.toContainText('**');
  // CJK emphasis: 「強調」 is bold.
  const weight = await doc.getByText('「強調」', { exact: true }).evaluate((el) => getComputedStyle(el).fontWeight);
  expect(Number(weight)).toBeGreaterThanOrEqual(700);
  // Shiki ran (JavaScript regex engine): the code block has several token colors.
  const colors = await doc.getByText('hello', { exact: false }).first().evaluate((el) => {
    const block = el.closest('[dir]') ?? el.parentElement!.parentElement!;
    return new Set([...block.querySelectorAll('span')].map((span) => getComputedStyle(span).color)).size;
  });
  expect(colors).toBeGreaterThan(3);
  // Without a WebView, diagram and chart blocks show their source.
  await expect(doc).toContainText('flowchart LR');
  await expect(doc).toContainText('"series"');
  expect(errors).toEqual([]);
});

test('no payload runs script and unsafe links are plain text', async ({ page }) => {
  const errors = await open(page);
  const doc = page.getByTestId('doc');
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as { __pwned?: unknown }).__pwned)).toBeUndefined();
  await expect(doc.locator('script, img[onerror], iframe')).toHaveCount(0);
  await expect(doc.getByRole('link', { name: 'bad link' })).toHaveCount(0);
  await expect(doc).not.toContainText("window.__pwned='script'");
  expect(errors).toEqual([]);
});

test('link presses reach onLinkPress, including relative links', async ({ page }) => {
  await open(page);
  const doc = page.getByTestId('doc');
  await doc.getByRole('link', { name: 'link', exact: true }).click();
  await expect(page.getByTestId('events')).toContainText('pressed:https://example.com');
  await doc.getByRole('link', { name: 'relative' }).click();
  await expect(page.getByTestId('events')).toContainText('pressed:docs/page.md');
});

test('the Copy button hands the code to onCopyCode', async ({ page }) => {
  await open(page);
  await page.getByTestId('doc').getByRole('button', { name: 'Copy code' }).first().click();
  await expect(page.getByTestId('events')).toContainText('copied:export function hello');
});

test('switching to dark recolors the text', async ({ page }) => {
  await open(page);
  const heading = page.getByTestId('doc').getByRole('heading', { name: 'Native demo' });
  const color = () => heading.evaluate((el) => getComputedStyle(el).color);
  expect(await color()).toBe('rgb(24, 24, 27)');
  await page.getByTestId('toggle-theme').click();
  await expect.poll(color).toBe('rgb(250, 250, 250)');
});

test('streaming never shows raw Markdown and ends with a rendered table', async ({ page }) => {
  await open(page);
  await page.getByTestId('start-stream').click();
  const stream = page.getByTestId('stream');
  const seen: string[] = [];
  for (let i = 0; i < 40 && !(await page.getByTestId('stream-done').isVisible()); i++) {
    seen.push((await stream.textContent()) ?? '');
    await page.waitForTimeout(20);
  }
  await expect(page.getByTestId('stream-done')).toBeVisible();
  expect(seen.filter((text) => text.includes('**'))).toEqual([]);
  await expect(stream).not.toContainText('|---');
  const bold = await stream.getByText('bold text', { exact: true }).evaluate((el) => getComputedStyle(el).fontWeight);
  expect(Number(bold)).toBeGreaterThanOrEqual(700);
});
