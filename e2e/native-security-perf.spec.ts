// React Native: every security payload and the performance budgets, rendered by react-llm-markdown/native in the
// Expo example app (web build, phone viewport). The app loads the document from `?md=`.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import { INPUT_BUDGET_MS, PERF_CASES, REGRESSION_MARKDOWN, RENDER_BUDGET_MS, REPEAT_MARKDOWN, SECURITY_CASES } from './cases.ts';
import { heapMb, interact, recordLongTasks, report, typingLatency, watch } from './harness.ts';

const APP = join(import.meta.dirname, '..', 'e2e-app', 'dist-web');
let cases: string;
let server: Server;
let base: string;

test.beforeAll(async () => {
  if (!existsSync(join(APP, 'index.html'))) throw new Error('e2e-app/dist-web is missing: run `node scripts/build-example.mjs`');
  cases = mkdtempSync(join(tmpdir(), 'rlm-native-cases-'));
  server = createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://x').pathname;
    if (path.startsWith('/cases/')) {
      const file = join(cases, path.slice('/cases/'.length).replace(/[^\w.-]/g, ''));
      res.writeHead(existsSync(file) ? 200 : 404, { 'content-type': 'text/markdown; charset=utf-8' });
      return res.end(existsSync(file) ? readFileSync(file) : '');
    }
    const file = join(APP, path);
    const target = existsSync(file) && extname(file) ? file : join(APP, 'index.html');
    res.writeHead(200, { 'content-type': extname(target) === '.js' ? 'text/javascript' : 'text/html' });
    res.end(readFileSync(target));
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

test.afterAll(async () => {
  await new Promise((done) => server.close(done));
  rmSync(cases, { recursive: true, force: true });
});

async function show(page: Page, name: string, markdown: string, lastText?: string) {
  writeFileSync(join(cases, `${name}.md`), markdown);
  await page.goto(`${base}/?md=/cases/${name}.md`);
  const doc = page.getByTestId('doc');
  // Rendered something (a test must not pass on an empty view).
  await expect(doc).toContainText(/\S/, { timeout: 60_000 });
  if (lastText) await expect(doc.getByText(lastText, { exact: true }).first()).toBeAttached({ timeout: 60_000 });
  return doc;
}

test.describe('security payloads', () => {
  for (const item of SECURITY_CASES) {
    test(`${item.id} ${item.title}`, async ({ page }) => {
      const watcher = await watch(page);
      const doc = await show(page, item.id, item.markdown);
      await page.waitForTimeout(500);
      await interact(page, doc, item.interact);

      expect(await watcher.xss()).toBeUndefined();
      expect(watcher.evilRequests).toEqual([]);
      expect(watcher.dialogs).toEqual([]);
      expect(watcher.pageErrors).toEqual([]);
      expect(new URL(page.url()).pathname).toBe('/');
      // Native views only: raw HTML never becomes elements, and no image loads from a refused URL.
      await expect(doc.locator('script, iframe, form, input, button[type="submit"], [onerror], [onload], [onclick], [onmouseover], picture, source')).toHaveCount(0);
      await expect(doc.locator('img[src^="data:"], img[src*="evil.example"]')).toHaveCount(0);
      // Links the URL policy refused are plain text, not links.
      for (const name of ['js', 'vb', 'file', 'rel', 'spaced']) await expect(doc.getByRole('link', { name, exact: true })).toHaveCount(0);
      // Every link press reaches the app's onLinkPress (never the browser); the only URLs it may see are allowed ones.
      const events = (await page.getByTestId('events').textContent()) ?? '';
      expect(events).not.toMatch(/pressed:(javascript|vbscript|file|data):/i);
    });
  }

  test('SEC-25 the hardened renderer still draws ordinary content', async ({ page }) => {
    const watcher = await watch(page);
    const doc = await show(page, 'regression', REGRESSION_MARKDOWN, 'Prices are $100 and $200.');
    await expect(doc).toContainText('Sales');
    await expect(doc).toContainText('flowchart LR');
    expect(watcher.pageErrors).toEqual([]);
  });
});

test.describe('performance', () => {
  test.setTimeout(180_000);

  for (const item of PERF_CASES) {
    test(`${item.id} ${item.title}`, async ({ page }, testInfo) => {
      const longestTask = await recordLongTasks(page);
      const markdown = item.markdown();
      const started = Date.now();
      await show(page, item.id, markdown, item.lastText);
      const renderMs = Date.now() - started;
      const inputMs = await typingLatency(page);
      const result = { sizeKb: Math.round(markdown.length / 1024), renderMs, longestTaskMs: await longestTask(), inputMs };
      report(testInfo, result);
      expect(renderMs).toBeLessThan(RENDER_BUDGET_MS);
      expect(inputMs).toBeLessThan(INPUT_BUDGET_MS);
    });
  }

  test('PERF-05 Repeated display does not slow down or keep memory', async ({ page }, testInfo) => {
    const doc = await show(page, 'repeat', REPEAT_MARKDOWN, 'End of answer');
    const timings: number[] = [];
    const heaps: (number | null)[] = [];
    for (let i = 2; i <= 6; i++) {
      const started = Date.now();
      // Remount the view with the same document, in the same page (like a chat showing the answer again).
      await page.getByTestId('rerender').click();
      await expect(page.getByTestId('events')).toContainText(`renders:${i}`);
      await expect(doc.getByText('End of answer', { exact: true })).toBeVisible();
      timings.push(Date.now() - started);
      heaps.push(await heapMb(page));
    }
    report(testInfo, { timings, heapMb: heaps });
    expect(Math.max(...timings)).toBeLessThan(RENDER_BUDGET_MS);
    const [first, last] = [heaps[0], heaps.at(-1)];
    if (first != null && last != null) expect(last - first).toBeLessThan(20);
  });
});
