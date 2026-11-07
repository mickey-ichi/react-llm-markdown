// The GitHub Pages playground (site-dist/, built by scripts/build-site.mjs).
import { existsSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join } from 'node:path';

import { expect, test } from '@playwright/test';

const SITE = join(import.meta.dirname, '..', 'site-dist');
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
let server: Server;
let base: string;

test.beforeAll(async () => {
  if (!existsSync(join(SITE, 'index.html'))) throw new Error('site-dist is missing: run `node scripts/build-site.mjs`');
  server = createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://x').pathname;
    const file = join(SITE, path === '/' ? 'index.html' : path);
    if (!file.startsWith(SITE) || !existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

test.afterAll(async () => {
  await new Promise((done) => server.close(done));
});

test('the attack payloads preset runs nothing, on the web and in the phone', async ({ page }) => {
  const dialogs: string[] = [];
  page.on('dialog', (dialog) => {
    dialogs.push(dialog.message());
    void dialog.dismiss();
  });
  const evil: string[] = [];
  await page.route('**/*evil.example*/**', (route) => {
    evil.push(route.request().url());
    return route.abort();
  });
  await page.goto(base);
  await page.getByRole('button', { name: 'Attack payloads' }).click();
  await expect(page.getByRole('button', { name: 'Stream it' })).toBeVisible({ timeout: 30_000 }); // stream finished

  const web = page.locator('.pane-web');
  const chart = web.locator('[data-rlm-block-body="echarts"]');
  await chart.scrollIntoViewIfNeeded();
  await expect(chart.locator('canvas')).toBeVisible({ timeout: 15_000 });
  const box = (await chart.boundingBox())!;
  for (const x of [0.3, 0.5, 0.7]) await page.mouse.move(box.x + box.width * x, box.y + box.height * 0.6);
  await page.mouse.click(box.x + box.width / 2, box.y + 14);

  // The phone draws the chart and the diagram in sandboxed WebView documents.
  const phone = page.locator('.phone');
  await expect(phone.locator('iframe[title="WebView block"]')).toHaveCount(2, { timeout: 15_000 }); // the chart and the diagram (the math is inline)
  const frames = await phone.locator('iframe').all();
  for (const frame of frames) {
    await frame.scrollIntoViewIfNeeded();
    await frame.hover();
  }
  await page.waitForTimeout(1_500);

  expect(dialogs).toEqual([]);
  expect(evil).toEqual([]);
  await expect(web.locator('a[href^="javascript:"], script, iframe, form')).toHaveCount(0);
});

test('streaming reveals the answer and both previews follow it', async ({ page }) => {
  await page.goto(base);
  await page.getByRole('button', { name: 'Math' }).click();
  await expect(page.getByRole('button', { name: 'Stop streaming' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stream it' })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.pane-web .katex').first()).toBeVisible();
  await expect(page.locator('.pane-phone')).toContainText('Prices stay text');
});

test('a shared link restores the document', async ({ page }) => {
  await page.goto(base);
  await page.locator('textarea').fill('# Shared heading\n\nHello from a link.');
  await page.getByRole('button', { name: 'Copy link' }).click();
  await expect(page).toHaveURL(/#md=/);
  await page.reload();
  await expect(page.locator('.pane-web h1')).toHaveText('Shared heading');
});

test('on a phone: no sideways scroll, sticky pane tabs, React Native without a device frame', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto(base);
  await expect(page.locator('.pane-web .rlm-markdown h1')).toBeVisible();
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(await overflow()).toBeLessThanOrEqual(0);

  await page.getByRole('tab', { name: 'React Native' }).click();
  await expect(page.locator('.device-bare')).toBeVisible();
  await expect(page.locator('.phone')).toHaveCount(0);
  expect(await overflow()).toBeLessThanOrEqual(0);

  // Scroll far down: the tabs stay at the top of the screen.
  await page.mouse.wheel(0, 2_000);
  await page.waitForTimeout(300);
  const top = await page.getByRole('tablist').evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeLessThanOrEqual(1);
  await context.close();
});
