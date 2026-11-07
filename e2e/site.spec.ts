// The GitHub Pages playground (site-dist/, built by scripts/build-site.mjs).
import { existsSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join } from 'node:path';

import { expect, test } from '@playwright/test';

const SITE = join(import.meta.dirname, '..', 'site-dist');
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png' };
let server: Server;
let base: string;

test.beforeAll(async () => {
  if (!existsSync(join(SITE, 'index.html'))) throw new Error('site-dist is missing: run `node scripts/build-site.mjs`');
  server = createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://x').pathname;
    let file = join(SITE, path);
    if (path.endsWith('/')) file = join(file, 'index.html');
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

const DOC_SLUGS = ['introduction', 'comparison', 'getting-started', 'web', 'react-native', 'rich-blocks', 'core', 'cli', 'faq', 'security', 'performance', 'test-report', 'changelog'];

test.describe('documentation', () => {
  test('every page renders, its table of contents matches its headings, and its links lead somewhere', async ({ page, request }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const slug of DOC_SLUGS) {
      await page.goto(`${base}/docs/${slug}/`);
      await expect(page.locator('.docs-page .rlm-markdown h1')).toBeVisible();
      await expect(page.locator(`.docs-nav a[aria-current="page"]`)).toHaveAttribute('href', `/docs/${slug}/`);
      for (const id of await page.locator('.docs-toc a').evaluateAll((as) => as.map((a) => a.getAttribute('href')!.slice(1)))) {
        await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
      }
      const internal = await page
        .locator('.docs-page a[href^="/"]')
        .evaluateAll((as) => as.map((a) => a.getAttribute('href')!.split('#')[0]!));
      for (const href of new Set(internal)) expect((await request.get(base + href)).status(), `${slug} → ${href}`).toBe(200);
    }
    expect(errors).toEqual([]);
  });

  test('moving between pages does not reload, and the address bar follows', async ({ page }) => {
    await page.goto(`${base}/docs/introduction/`);
    await page.evaluate(() => ((window as { __kept?: boolean }).__kept = true));
    await page.locator('.docs-nav').getByRole('link', { name: 'Core API' }).click();
    await expect(page.locator('.docs-page h1')).toHaveText(/Core API/);
    expect(new URL(page.url()).pathname).toBe('/docs/core/');
    await page.getByRole('link', { name: /Next/ }).click();
    await expect(page.locator('.docs-page h1')).toHaveText(/CLI viewer/);
    expect(await page.evaluate(() => (window as { __kept?: boolean }).__kept)).toBe(true);
    await page.goBack();
    await expect(page.locator('.docs-page h1')).toHaveText(/Core API/);
  });

  test('examples show a live preview, with the source one tab away', async ({ page }) => {
    await page.goto(`${base}/docs/rich-blocks/`);
    const examples = page.locator('.live');
    await expect(examples).toHaveCount(4);
    const chart = examples.nth(3);
    await chart.scrollIntoViewIfNeeded();
    await expect(chart.locator('[data-rlm-block-body="echarts"] canvas')).toBeVisible({ timeout: 15_000 });
    await chart.getByRole('tab', { name: 'Markdown' }).click();
    await expect(chart).toContainText('"series"');
    await expect(examples.nth(1).locator('.katex').first()).toBeVisible();
  });

  test('every page has its own title, description and share card; unknown URLs get a 404 page', async ({ request }) => {
    for (const slug of DOC_SLUGS) {
      const html = await (await request.get(`${base}/docs/${slug}/`)).text();
      expect(html).toMatch(/<title>[^<]+ — react-llm-markdown<\/title>/);
      expect(html).toContain(`<link rel="canonical" href="https://mickey-ichi.github.io/react-llm-markdown/docs/${slug}/" />`);
      expect(html).toContain('og:image" content="https://mickey-ichi.github.io/react-llm-markdown/social-card.png"');
    }
    expect(await (await request.get(`${base}/sitemap.xml`)).text()).toContain('/docs/faq/');
    expect((await request.get(`${base}/robots.txt`)).status()).toBe(200);
    expect(await (await request.get(`${base}/404.html`)).text()).toContain("This page doesn't exist");
  });

  test('Vietnamese and Japanese: every page renders, links stay in the language, the switcher keeps the page', async ({ page, request }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const locale of ['vi', 'ja']) {
      for (const slug of DOC_SLUGS) {
        await page.goto(`${base}/${locale}/docs/${slug}/`);
        await expect(page.locator('.docs-page .rlm-markdown h1').first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.lang)).toBe(locale);
        const internal = await page
          .locator('.docs-page a[href^="/"], .docs-nav a')
          .evaluateAll((as) => as.map((a) => a.getAttribute('href')!.split('#')[0]!));
        for (const href of new Set(internal)) {
          expect(href.startsWith(`/${locale}/`), `${locale}/${slug} → ${href}`).toBe(true);
          expect((await request.get(base + href)).status(), `${locale}/${slug} → ${href}`).toBe(200);
        }
      }
    }
    await page.goto(`${base}/vi/docs/web/`);
    await page.locator('.lang-switch').getByRole('link', { name: 'JA' }).click();
    await expect(page).toHaveURL(/\/ja\/docs\/web\/$/);
    await expect(page.locator('.docs-nav a[aria-current="page"]')).toHaveText('Web レンダラー');
    await page.goto(`${base}/ja/docs/security/`);
    await expect(page.locator('.docs-notice')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('every page lists its translations, and the playground is translated', async ({ page, request }) => {
    const html = await (await request.get(`${base}/vi/docs/core/`)).text();
    expect(html).toContain('<html lang="vi">');
    for (const code of ['en', 'vi', 'ja']) expect(html).toContain(`hreflang="${code}"`);
    expect(await (await request.get(`${base}/sitemap.xml`)).text()).toContain('/ja/docs/faq/');
    await page.goto(`${base}/vi/`);
    await expect(page.getByRole('button', { name: 'Chạy stream' })).toBeVisible();
    await expect(page.locator('.brand-icon')).toHaveJSProperty('naturalWidth', 192);
  });

  test('links between repo docs become site pages', async ({ page }) => {
    await page.goto(`${base}/docs/security/`);
    await expect(page.locator('.docs-page a', { hasText: 'test-report.md' }).first()).toHaveAttribute('href', '/docs/test-report/');
    await expect(page.locator('.docs-page a[href*="github.com/mickey-ichi/react-llm-markdown/blob/main/src/core/security.ts"]').first()).toBeAttached();
  });

  test('on a phone: a page menu, and no page scrolls sideways', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    for (const slug of DOC_SLUGS) {
      await page.goto(`${base}/docs/${slug}/`);
      await expect(page.locator('.docs-page h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), slug).toBeLessThanOrEqual(0);
    }
    await page.getByRole('button', { name: /Changelog/ }).click();
    await page.locator('.docs-nav').getByRole('link', { name: 'Web renderer' }).click();
    await expect(page.locator('.docs-page h1')).toHaveText(/Web renderer/);
    await expect(page.locator('.docs-nav')).toBeHidden();
    await context.close();
  });
});
