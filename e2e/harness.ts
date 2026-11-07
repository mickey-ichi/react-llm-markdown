// Helpers shared by the security and performance suites.
import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';

import { EVIL_HOST, type Interaction } from './cases.ts';

/** Records requests to the attacker host (and blocks them), dialogs and page errors. */
export async function watch(page: Page) {
  const evilRequests: string[] = [];
  const dialogs: string[] = [];
  const pageErrors: string[] = [];
  await page.route(`**/*${EVIL_HOST}*/**`, (route) => {
    evilRequests.push(route.request().url());
    return route.abort();
  });
  page.on('request', (request) => {
    if (request.url().includes(EVIL_HOST) && !evilRequests.includes(request.url())) evilRequests.push(request.url());
  });
  page.on('dialog', (dialog) => {
    dialogs.push(dialog.message());
    void dialog.dismiss();
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  // A link that opened a new tab is closed right away; it is reported as a navigation if it left the page.
  page.context().on('page', (popup) => void popup.close());
  return {
    evilRequests,
    dialogs,
    pageErrors,
    xss: () => page.evaluate(() => (window as { __xss?: unknown }).__xss),
  };
}

/** Hovers and clicks where a payload could hide a handler. */
export async function interact(page: Page, root: Locator, actions: Interaction[] = []) {
  const charts = await root.locator('[data-rlm-block-body="echarts"]').all();
  for (const action of actions) {
    if (action === 'hover-chart' || action === 'click-chart-title') {
      for (const chart of charts) {
        await chart.scrollIntoViewIfNeeded();
        await expect(chart.locator('canvas')).toBeVisible({ timeout: 15_000 });
        const box = (await chart.boundingBox())!;
        if (action === 'hover-chart') {
          for (const [x, y] of [[0.3, 0.6], [0.5, 0.5], [0.7, 0.6], [0.5, 0.3]]) {
            await page.mouse.move(box.x + box.width * x!, box.y + box.height * y!);
            await page.waitForTimeout(80);
          }
        } else {
          for (const y of [10, 24, 40]) await page.mouse.click(box.x + box.width / 2, box.y + y);
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        }
      }
    }
    if (action === 'click-links') {
      const targets = [root.locator('a, [role="link"], svg .node'), root.getByText('hover me')];
      for (const target of (await Promise.all(targets.map((t) => t.all()))).flat()) {
        await target.hover({ timeout: 2_000 }).catch(() => undefined);
        await target.click({ timeout: 2_000, modifiers: [] }).catch(() => undefined);
      }
    }
  }
  await page.waitForTimeout(300);
}

/** Starts collecting long tasks (main thread busy > 50 ms) before the page loads. */
export async function recordLongTasks(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __longTasks: number[] };
    w.__longTasks = [];
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) w.__longTasks.push(entry.duration);
      }).observe({ type: 'longtask', buffered: true });
    } catch {
      // not supported
    }
  });
  return async () => {
    const tasks = await page.evaluate(() => (window as unknown as { __longTasks: number[] }).__longTasks);
    return Math.round(Math.max(0, ...tasks));
  };
}

/**
 * Time for typing into a text field to show up: how long the page stays unresponsive after rendering. The field is
 * added outside the rendered view (a chat composer, in a real app).
 */
export async function typingLatency(page: Page): Promise<number> {
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.id = 'rlm-probe';
    input.style.cssText = 'position:fixed;bottom:0;left:0;z-index:99';
    document.body.append(input);
  });
  const started = Date.now();
  await page.locator('#rlm-probe').pressSequentially('ok', { delay: 0 });
  await expect(page.locator('#rlm-probe')).toHaveValue('ok');
  return Date.now() - started;
}

export async function heapMb(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    return memory ? Math.round(memory.usedJSHeapSize / 1_048_576) : null;
  });
}

/** Attaches a measurement to the test report and prints it. */
export function report(testInfo: TestInfo, result: object) {
  testInfo.annotations.push({ type: 'perf', description: JSON.stringify(result) });
  console.log(`[perf] ${testInfo.project.name} ${testInfo.title}: ${JSON.stringify(result)}`);
}
