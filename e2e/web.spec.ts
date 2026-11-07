// Web E2E: the CLI viewer (which renders with MarkdownView) in a real Chromium.
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import { createViewerServer, resolveTarget } from '../dist/cli.js';

let dir: string;
let server: Server;
let base: string;

test.beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'rlm-e2e-'));
  cpSync(join(import.meta.dirname, 'fixtures', 'doc'), dir, { recursive: true });
  server = createViewerServer(resolveTarget(dir, process.cwd()));
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

test.afterAll(async () => {
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
  rmSync(dir, { recursive: true, force: true });
});

/** Fails the test on any dialog or page error; returns the page once the rich blocks are drawn. */
async function open(page: Page, path = '/') {
  const errors: string[] = [];
  page.on('dialog', (dialog) => {
    errors.push(`dialog: ${dialog.message()}`);
    void dialog.dismiss();
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  await page.goto(base + path);
  return errors;
}

test('renders every block type', async ({ page }) => {
  const errors = await open(page);
  const view = page.locator('.rlm-markdown');
  await expect(view.locator('h1')).toHaveText('react-llm-markdown');
  await expect(view.locator('table')).toContainText('beta');
  await expect(view.locator('mark')).toHaveText('highlight');
  await expect(view.locator('input[type=checkbox]')).toHaveCount(2);
  // Shiki: colored tokens, lines kept.
  const code = view.locator('[data-streamdown="code-block-body"]').first();
  await expect(code).toContainText('return `Hello, ${name}`');
  await expect(code.locator('span[style*="--sdm-c"]').first()).toBeVisible();
  // KaTeX: inline and display.
  await expect(view.locator('.katex').first()).toBeVisible();
  await expect(view.locator('.katex-display')).toHaveCount(1);
  // Mermaid: the first diagram becomes an SVG.
  await expect(view.locator('[data-streamdown="mermaid-block"] svg[aria-roledescription^="flowchart"]').first()).toBeVisible({ timeout: 15_000 });
  // ECharts: a canvas inside the chart block.
  await expect(view.locator('[data-rlm-block-body="echarts"] canvas')).toBeVisible({ timeout: 15_000 });
  // Relative image served from the document's folder.
  await expect(view.locator('img.rlm-img[alt="picture"]')).toHaveJSProperty('naturalWidth', 80);
  // The prebuilt prefixed CSS is applied (a Tailwind utility from Streamdown).
  const display = await view.locator('[data-streamdown="code-block-header"]').first().evaluate((el) => getComputedStyle(el).display);
  expect(display).toBe('flex');
  expect(errors).toEqual([]);
});

test('no payload runs script', async ({ page }) => {
  const errors = await open(page);
  const view = page.locator('.rlm-markdown');
  await expect(view.locator('[data-rlm-block-body="echarts"] canvas')).toBeVisible({ timeout: 15_000 });
  // Diagrams render when scrolled into view.
  const payloadDiagram = view.locator('[data-streamdown="mermaid-block"]').nth(1);
  await payloadDiagram.scrollIntoViewIfNeeded();
  await expect(payloadDiagram.locator('svg[aria-roledescription]')).toBeVisible({ timeout: 15_000 });
  // The label is plain text, never an element.
  await expect(payloadDiagram.locator('svg img, svg foreignObject')).toHaveCount(0);

  // Hover the bars so the tooltip formatter is drawn.
  const chart = view.locator('[data-rlm-block-body="echarts"]');
  const box = (await chart.boundingBox())!;
  for (const x of [0.3, 0.5, 0.7]) await page.mouse.move(box.x + box.width * x, box.y + box.height * 0.7);
  // Click whatever is left of the payload links / math.
  await view.getByText('bad link').click();
  // KaTeX (trust: false) renders \href as an error, so there is usually nothing to click.
  await view.getByText('click', { exact: true }).click({ timeout: 2_000 }).catch(() => undefined);

  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as { __pwned?: unknown }).__pwned)).toBeUndefined();
  await expect(view.locator('script')).toHaveCount(0);
  await expect(view.locator('a[href^="javascript:"]')).toHaveCount(0);
  await expect(view.locator('[onerror]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('external links open in a new tab without a referrer; footnotes stay in the page', async ({ page }) => {
  await open(page);
  const link = page.locator('.rlm-markdown a', { hasText: 'link' }).first();
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow');
  // Let the lazily drawn diagrams render first, so the page stops growing.
  for (const diagram of await page.locator('[data-streamdown="mermaid-block"]').all()) {
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram.locator('svg[aria-roledescription]')).toBeVisible({ timeout: 15_000 });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('a[href="#user-content-fn-1"]').click();
  await expect(page.locator('#user-content-fn-1')).toBeInViewport({ timeout: 10_000 });
  expect(new URL(page.url()).hash).toBe('');
});

test('theme toggle switches to dark and the chart re-themes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await open(page);
  await expect(page.locator('[data-rlm-block-body="echarts"] canvas')).toBeVisible({ timeout: 15_000 });
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await bg()).toBe('rgb(255, 255, 255)');
  await page.getByRole('button', { name: /dark theme/ }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  expect(await bg()).toBe('rgb(9, 9, 11)');
});

test('live reload picks up a saved change', async ({ page }) => {
  await open(page, '/other.md');
  await expect(page.locator('.rlm-markdown h1')).toHaveText('Other page');
  writeFileSync(join(dir, 'other.md'), '# Other page\n\nEdited live.\n');
  await expect(page.locator('.rlm-markdown')).toContainText('Edited live.', { timeout: 10_000 });
});

test('the server does not leak files', async ({ request }) => {
  expect((await request.get(`${base}/.env`)).status()).toBe(404);
  expect((await request.get(`${base}/%2e%2e/%2e%2e/etc/passwd`)).status()).toBe(404);
  expect((await request.get(`${base}/__rlm/doc?path=%2F.env`)).status()).toBe(404);
});
