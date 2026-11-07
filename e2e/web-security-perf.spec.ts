// Web: every security payload and the performance budgets, rendered by MarkdownView in the CLI viewer.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import { createViewerServer, resolveTarget } from '../dist/cli.js';
import { INPUT_BUDGET_MS, PERF_CASES, REGRESSION_MARKDOWN, RENDER_BUDGET_MS, REPEAT_MARKDOWN, SECURITY_CASES } from './cases.ts';
import { heapMb, interact, recordLongTasks, report, typingLatency, watch } from './harness.ts';

let dir: string;
let server: Server;
let base: string;

test.beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'rlm-secperf-'));
  writeFileSync(join(dir, 'README.md'), '# index\n');
  server = createViewerServer(resolveTarget(dir, process.cwd()));
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

test.afterAll(async () => {
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
  rmSync(dir, { recursive: true, force: true });
});

/** Writes `markdown` to `<name>.md` and opens it in the viewer. */
async function show(page: Page, name: string, markdown: string) {
  writeFileSync(join(dir, `${name}.md`), markdown);
  await page.goto(`${base}/${name}.md`);
  const view = page.locator('.rlm-markdown');
  await expect(view).toBeAttached();
  return view;
}

test.describe('security payloads', () => {
  for (const item of SECURITY_CASES) {
    test(`${item.id} ${item.title}`, async ({ page }) => {
      const watcher = await watch(page);
      const view = await show(page, item.id, item.markdown);
      // Let the rich blocks render (charts at once, diagrams when scrolled into view).
      for (const diagram of await view.locator('[data-streamdown="mermaid-block"]').all()) await diagram.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1_500);
      await interact(page, view, item.interact);

      expect(await watcher.xss()).toBeUndefined();
      expect(watcher.evilRequests).toEqual([]);
      expect(watcher.dialogs).toEqual([]);
      expect(new URL(page.url()).pathname).toBe(`/${item.id}.md`);
      await expect(view.locator('script, iframe, form, button[type="submit"], [onerror], [onload], [onclick], [onmouseover]')).toHaveCount(0);
      await expect(view.locator('a[href^="javascript:"], a[href^="vbscript:"], a[href^="file:"], img[src^="data:"]')).toHaveCount(0);
    });
  }

  test('SEC-25 the hardened renderer still draws ordinary content', async ({ page }) => {
    const watcher = await watch(page);
    const view = await show(page, 'regression', REGRESSION_MARKDOWN);
    await expect(view.locator('table')).toContainText('Sales');
    await expect(view.locator('.katex').first()).toBeVisible();
    await expect(view).toContainText('Prices are $100 and $200.');
    await expect(view.locator('[data-rlm-block-body="echarts"] canvas')).toHaveCount(2, { timeout: 15_000 });
    const diagram = view.locator('[data-streamdown="mermaid-block"]');
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram.locator('svg[aria-roledescription^="flowchart"]')).toBeVisible({ timeout: 15_000 });
    expect(watcher.pageErrors).toEqual([]);
  });
});

test.describe('performance', () => {
  test.setTimeout(180_000);

  for (const item of PERF_CASES) {
    test(`${item.id} ${item.title}`, async ({ page }, testInfo) => {
      const longestTask = await recordLongTasks(page);
      const markdown = item.markdown();
      writeFileSync(join(dir, `${item.id}.md`), markdown);
      const started = Date.now();
      await page.goto(`${base}/${item.id}.md`);
      const view = page.locator('.rlm-markdown');
      await expect(view.getByText(item.lastText, { exact: true }).first()).toBeAttached({ timeout: 60_000 });
      if (markdown.includes('```echarts')) await expect(view.locator('[data-rlm-block-body="echarts"] canvas').last()).toBeAttached({ timeout: 60_000 });
      const renderMs = Date.now() - started;

      // Still responsive right after rendering: typing shows up at once.
      const inputMs = await typingLatency(page);

      const result = { sizeKb: Math.round(markdown.length / 1024), renderMs, longestTaskMs: await longestTask(), inputMs };
      report(testInfo, result);
      expect(renderMs).toBeLessThan(RENDER_BUDGET_MS);
      expect(inputMs).toBeLessThan(INPUT_BUDGET_MS);
    });
  }

  test('PERF-05 Repeated display does not slow down or keep memory', async ({ page }, testInfo) => {
    writeFileSync(join(dir, 'repeat.md'), `${REPEAT_MARKDOWN}\n\nRun 0`);
    await page.goto(`${base}/repeat.md`);
    const view = page.locator('.rlm-markdown');
    const timings: number[] = [];
    const heaps: (number | null)[] = [];
    for (let i = 1; i <= 5; i++) {
      const started = Date.now();
      // Live reload re-renders the same page in place, like a chat showing the same answer again.
      writeFileSync(join(dir, 'repeat.md'), `${REPEAT_MARKDOWN}\n\nRun ${i}`);
      await expect(view.getByText(`Run ${i}`, { exact: true })).toBeVisible({ timeout: 30_000 });
      await expect(view.locator('[data-rlm-block-body="echarts"] canvas')).toBeAttached();
      timings.push(Date.now() - started);
      await page.requestGC?.();
      heaps.push(await heapMb(page));
    }
    report(testInfo, { timings, heapMb: heaps });
    expect(Math.max(...timings)).toBeLessThan(RENDER_BUDGET_MS);
    const [first, last] = [heaps[0], heaps.at(-1)];
    if (first != null && last != null) expect(last - first).toBeLessThan(20);
  });
});
