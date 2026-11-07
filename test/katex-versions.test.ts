// KaTeX's CSS class names change between versions (0.18 prefixed them), so each renderer's CSS must come from the
// KaTeX that renders its math.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { KATEX_STYLESHEET } from '../dist/native/webview-html.js';
import { expect } from './expect.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(ROOT, 'package.json'));
const version = (pkgJson: string) => (JSON.parse(readFileSync(pkgJson, 'utf8')) as { version: string }).version;

describe('KaTeX versions', () => {
  it('React Native: the WebView stylesheet matches the katex that renders native math', () => {
    const native = version(require.resolve('katex/package.json'));
    expect(KATEX_STYLESHEET.url).toContain(`katex@${native}/`);
  });

  it('web: styles.css carries the CSS of the katex @streamdown/math renders with', () => {
    const fromMath = createRequire(join(ROOT, 'node_modules', '@streamdown', 'math', 'package.json'));
    const web = version(fromMath.resolve('katex/package.json'));
    const css = readFileSync(join(ROOT, 'dist', 'styles.css'), 'utf8');
    const [major, minor] = web.split('.').map(Number) as [number, number];
    const prefixed = major > 0 || minor >= 18;
    // 0.18 renamed .base / .strut to .katex-base / .katex-strut.
    expect(css.includes('.katex-strut')).toBe(prefixed);
    expect(/\.katex \.strut/.test(css)).toBe(!prefixed);
  });
});
