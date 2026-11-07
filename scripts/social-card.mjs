// Renders site/social-card.png (1200x630), the image shown when a link to the site is shared.
// Run after changing the brand: node scripts/social-card.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const icon = readFileSync(join(ROOT, 'assets', 'icon.svg'), 'utf8').replace('width="1024" height="1024"', 'width="168" height="168"');
const html = `<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@500&display=swap" rel="stylesheet">
<style>
  body { margin: 0; width: 1200px; height: 630px; background: #eef0f3; color: #14161b; font-family: 'IBM Plex Sans', sans-serif; }
  .card { box-sizing: border-box; height: 100%; padding: 72px 80px; display: flex; flex-direction: column; justify-content: space-between; }
  .top { display: flex; align-items: center; gap: 36px; }
  h1 { margin: 0; font: 800 78px/1 'Bricolage Grotesque', sans-serif; letter-spacing: -0.035em; }
  p { margin: 0; max-width: 980px; color: #3a404d; font: 500 40px/1.3 'Bricolage Grotesque', sans-serif; letter-spacing: -0.01em; }
  mark { background: #ffe066; color: #14161b; padding: 0 0.12em; }
  .tags { display: flex; gap: 14px; font: 500 24px/1 'IBM Plex Mono', monospace; color: #5a6070; }
  .tags span { padding: 12px 18px; border: 2px solid #d6dae1; border-radius: 999px; background: #fff; }
</style></head><body><div class="card">
  <div class="top">${icon}<h1>react-llm-markdown</h1></div>
  <p>Markdown from your model, rendered <mark>safely</mark> — in the browser and on the phone.</p>
  <div class="tags"><span>React</span><span>React Native</span><span>Streaming</span><span>Math · Mermaid · Charts</span></div>
</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: join(ROOT, 'site', 'social-card.png') });
await browser.close();
console.log('wrote site/social-card.png');
