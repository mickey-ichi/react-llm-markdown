// Regenerates the README screenshots in assets/: the web viewer and the React Native renderer (the Expo example app
// built for the web), light and dark. Needs `npm run build`, `node scripts/build-example.mjs` and Playwright Chromium.
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium, devices } from '@playwright/test';

import { createViewerServer, resolveTarget } from '../dist/cli.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets');
const APP = join(ROOT, 'example', 'dist-web');
if (!existsSync(join(APP, 'index.html'))) throw new Error('Run `node scripts/build-example.mjs` first');
mkdirSync(OUT, { recursive: true });

const listen = (server) => new Promise((done) => server.listen(0, '127.0.0.1', () => done(`http://127.0.0.1:${server.address().port}`)));

const web = createViewerServer(resolveTarget(join(ROOT, 'e2e', 'fixtures', 'doc'), ROOT));
const app = createServer((req, res) => {
  const file = join(APP, new URL(req.url ?? '/', 'http://x').pathname);
  const target = existsSync(file) && extname(file) ? file : join(APP, 'index.html');
  res.writeHead(200, { 'content-type': extname(target) === '.js' ? 'text/javascript' : 'text/html' });
  res.end(readFileSync(target));
});
const [webUrl, appUrl] = await Promise.all([listen(web), listen(app)]);
const browser = await chromium.launch();

/** Web viewer: the page top (text, table, code, math) and the rich blocks (Mermaid, ECharts). */
for (const scheme of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 2, colorScheme: scheme });
  await page.goto(webUrl);
  const view = page.locator('.rlm-markdown');
  for (const diagram of await view.locator('[data-streamdown="mermaid-block"]').all()) {
    await diagram.scrollIntoViewIfNeeded();
    await diagram.locator('svg[aria-roledescription]').waitFor({ timeout: 20_000 });
  }
  await view.locator('[data-rlm-block-body="echarts"] canvas').waitFor({ timeout: 20_000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  const end = await view.locator('[data-rlm-block="echarts"]').boundingBox();
  await page.setViewportSize({ width: 900, height: Math.ceil(end.y + end.height + 8) });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, `web-${scheme}.png`), clip: { x: 0, y: 0, width: 900, height: Math.ceil(end.y + end.height + 8) } });
  await page.close();
}

/** React Native: the example app on a phone, from the document's title (the test buttons above it are left out). */
for (const scheme of ['light', 'dark']) {
  const page = await browser.newPage({ ...devices['Pixel 7'], colorScheme: scheme });
  await page.goto(appUrl);
  await page.getByTestId('doc').getByText('Native demo').waitFor();
  await page.waitForTimeout(600);
  const top = (await page.getByTestId('doc').boundingBox()).y - 16;
  const { width, height } = page.viewportSize();
  await page.screenshot({ path: join(OUT, `native-${scheme}.png`), clip: { x: 0, y: top, width, height: height - top } });
  await page.close();
}

await browser.close();
app.close();
web.closeAllConnections();
web.close();
console.log('wrote assets/web-{light,dark}.png and assets/native-{light,dark}.png');
