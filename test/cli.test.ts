import { after, before, describe, it } from 'node:test';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createViewerServer, fileInRoot, main, pageHtml, resolveTarget } from '../dist/cli.js';
import { expect } from './expect.ts';

let dir: string;
let root: string;

before(() => {
  dir = mkdtempSync(join(tmpdir(), 'rlm-test-'));
  root = join(dir, 'docs');
  mkdirSync(join(root, 'sub'), { recursive: true });
  mkdirSync(join(root, '.git'));
  writeFileSync(join(root, 'README.md'), '# Hello\n');
  writeFileSync(join(root, 'sub', 'page.md'), '# Page\n');
  writeFileSync(join(root, 'pic.png'), 'png');
  writeFileSync(join(root, '.env'), 'SECRET=1');
  writeFileSync(join(root, '.git', 'config'), 'x');
  writeFileSync(join(dir, 'outside.md'), '# Outside\n');
  symlinkSync(join(dir, 'outside.md'), join(root, 'link.md'));
});

after(() => rmSync(dir, { recursive: true, force: true }));

describe('resolveTarget', () => {
  it('opens README.md of a folder, or the file given', () => {
    const fromDir = resolveTarget('docs', dir);
    expect(fromDir.file.endsWith(join('docs', 'README.md'))).toBe(true);
    const fromFile = resolveTarget(join('docs', 'sub', 'page.md'), dir);
    expect(fromFile.root.endsWith(join('docs', 'sub'))).toBe(true);
  });

  it('fails clearly on a missing path or a folder without README', () => {
    expect(() => resolveTarget('nope.md', dir)).toThrow('Not found');
    expect(() => resolveTarget(join('docs', 'sub'), dir)).toThrow('No README.md');
  });
});

describe('fileInRoot', () => {
  it('serves files inside the folder', () => {
    const { root: real } = resolveTarget('docs', dir);
    expect(fileInRoot(real, '/pic.png')).toBe(join(real, 'pic.png'));
    expect(fileInRoot(real, '/sub/page.md')).toBe(join(real, 'sub', 'page.md'));
  });

  it('refuses traversal, dotfiles, symlinks out of the folder and folders', () => {
    const { root: real } = resolveTarget('docs', dir);
    for (const path of ['/../outside.md', '/%2e%2e/outside.md', '/.env', '/.git/config', '/link.md', '/sub', '/a%00b', '/%E0%A4%A']) {
      expect(fileInRoot(real, path)).toBeNull();
    }
  });
});

describe('pageHtml', () => {
  it('escapes the title', () => {
    expect(pageHtml('<x>.md')).toContain('<title>&#60;x&#62;.md</title>');
  });
});

describe('viewer server', () => {
  it('serves the page, the document, assets and files, and nothing else', async () => {
    const server = createViewerServer(resolveTarget('docs', dir));
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const get = (path: string, accept = '*/*') => fetch(base + path, { headers: { accept } });
    try {
      const page = await get('/', 'text/html');
      expect(page.status).toBe(200);
      expect(await page.text()).toContain('/__rlm/client.js');

      const doc = await get('/__rlm/doc?path=%2F');
      expect(await doc.json()).toEqual({ name: 'README.md', content: '# Hello\n' });
      const sub = await get('/__rlm/doc?path=%2Fsub%2Fpage.md');
      expect(((await sub.json()) as { content: string }).content).toBe('# Page\n');
      expect((await get('/__rlm/doc?path=%2Fpic.png')).status).toBe(404);
      expect((await get('/__rlm/doc?path=%2F..%2Foutside.md')).status).toBe(404);

      expect((await get('/sub/page.md', 'text/html')).headers.get('content-type')).toContain('text/html');
      expect((await get('/sub/page.md')).headers.get('content-type')).toContain('text/markdown');
      expect((await get('/__rlm/styles.css')).status).toBe(200);
      expect((await get('/__rlm/client.js')).status).toBe(200);
      expect((await get('/pic.png')).headers.get('content-type')).toBe('image/png');
      expect((await get('/.env')).status).toBe(404);
      expect((await get('/__rlm/../cli.js')).status).toBe(404);
      expect((await fetch(base + '/', { method: 'POST' })).status).toBe(405);
    } finally {
      server.closeAllConnections();
      await new Promise((done) => server.close(done));
    }
  });
});

describe('main', () => {
  it('prints the version and rejects a bad port', async () => {
    expect(await main(['--version'])).toBe(0);
    expect(await main(['--port', 'abc'])).toBe(2);
    expect(await main(['--bogus'])).toBe(2);
  });
});
