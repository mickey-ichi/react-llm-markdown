/**
 * `react-llm-markdown [file.md | dir]` — view a local Markdown file in the browser with live reload.
 *
 * Serves on 127.0.0.1 only. Files are served from the document's folder only (images, linked .md
 * files); a linked .md opens in the viewer too.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, realpathSync, statSync, watch, type FSWatcher } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const HERE = dirname(fileURLToPath(import.meta.url));
const VIEWER_DIR = join(HERE, 'viewer');
const STYLES = join(HERE, 'styles.css');
const PKG = JSON.parse(readFileSync(join(HERE, '..', 'package.json'), 'utf8')) as { version: string };

const USAGE = `Usage: react-llm-markdown [file.md | folder] [options]

View a Markdown file in your browser, with live reload. Default: README.md in the current folder.

Options:
  -p, --port <n>   Port to listen on (default: a free port)
      --no-open    Do not open the browser
  -v, --version    Print the version
  -h, --help       Show this help`;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.markdown': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

const MARKDOWN_EXT = new Set(['.md', '.markdown', '.mdx']);

/** The HTML shell; the document itself is fetched by the viewer from /__rlm/doc. */
export function pageHtml(title: string): string {
  const safe = title.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safe}</title>
<link rel="stylesheet" href="/__rlm/styles.css">
<link rel="stylesheet" href="/__rlm/viewer.css">
<script>try{var t=localStorage.getItem('rlm-theme');if(t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark')}catch(e){}</script>
</head>
<body>
<div id="root"></div>
<script type="module" src="/__rlm/client.js"></script>
</body>
</html>
`;
}

export interface ResolvedTarget {
  /** Folder files are served from. */
  root: string;
  /** The Markdown file opened at `/`. */
  file: string;
}

/** `file.md` → its folder + itself; a folder → itself + its README.md (or readme.md, README.markdown, index.md). */
export function resolveTarget(arg: string | undefined, cwd: string): ResolvedTarget {
  const target = resolve(cwd, arg ?? '.');
  if (!existsSync(target)) throw new Error(`Not found: ${target}`);
  if (statSync(target).isDirectory()) {
    for (const name of ['README.md', 'readme.md', 'README.markdown', 'index.md']) {
      const file = join(target, name);
      if (existsSync(file)) return { root: realpathSync(target), file: realpathSync(file) };
    }
    throw new Error(`No README.md in ${target}; pass a .md file`);
  }
  const file = realpathSync(target);
  return { root: dirname(file), file };
}

/**
 * Maps a URL path to a file inside `root`, or null when it would leave `root` (`..`, symlinks
 * pointing outside) or names a dotfile / dot-folder (`.env`, `.git/`).
 */
export function fileInRoot(root: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const candidate = resolve(root, `.${decoded.startsWith('/') ? decoded : `/${decoded}`}`);
  const rel = relative(root, candidate);
  if (rel.startsWith('..') || resolve(root, rel) !== candidate) return null;
  if (rel.split(sep).some((part) => part.startsWith('.'))) return null;
  if (!existsSync(candidate)) return null;
  const real = realpathSync(candidate);
  if (real !== root && !real.startsWith(root + sep)) return null;
  return statSync(real).isFile() ? real : null;
}

function send(res: ServerResponse, status: number, body: string | Buffer, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'content-type': type,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(body);
}

/** The Markdown file a page or API request refers to: `/` is the opened file. */
function docFor(target: ResolvedTarget, path: string): string | null {
  if (path === '/' || path === '') return target.file;
  const file = fileInRoot(target.root, path);
  return file && MARKDOWN_EXT.has(extname(file).toLowerCase()) ? file : null;
}

/**
 * Only requests addressed to this server by its loopback name are answered. A web page cannot otherwise reach a
 * 127.0.0.1 server, except through DNS rebinding (its own host name re-pointed at 127.0.0.1), which keeps that name in
 * the Host header.
 */
export function isAllowedHost(host: string | undefined, port: number): boolean {
  const value = (host ?? '').toLowerCase();
  return value === `127.0.0.1:${port}` || value === `localhost:${port}` || value === `[::1]:${port}`;
}

export function createViewerServer(target: ResolvedTarget) {
  const watchers = new Map<string, { watcher: FSWatcher; clients: Set<ServerResponse> }>();

  function subscribe(file: string, res: ServerResponse) {
    let entry = watchers.get(file);
    if (!entry) {
      const clients = new Set<ServerResponse>();
      let timer: NodeJS.Timeout | undefined;
      // Editors save in several writes (or rename over the file); debounce into one reload.
      const watcher = watch(file, () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          for (const client of clients) client.write('event: change\ndata: {}\n\n');
        }, 80);
      });
      entry = { watcher, clients };
      watchers.set(file, entry);
    }
    entry.clients.add(res);
    res.on('close', () => {
      entry.clients.delete(res);
      if (entry.clients.size === 0) {
        entry.watcher.close();
        watchers.delete(file);
      }
    });
  }

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const address = server.address();
    if (!isAllowedHost(req.headers.host, typeof address === 'object' && address ? address.port : -1)) {
      return send(res, 403, 'Forbidden: open this viewer at 127.0.0.1 or localhost');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');

    if (url.pathname.startsWith('/__rlm/')) {
      const name = url.pathname.slice('/__rlm/'.length);
      if (name === 'doc' || name === 'events') {
        const file = docFor(target, url.searchParams.get('path') ?? '/');
        if (!file) return send(res, 404, 'Not a Markdown file in this folder');
        if (name === 'events') {
          res.writeHead(200, {
            'content-type': 'text/event-stream',
            'cache-control': 'no-store',
            connection: 'keep-alive',
          });
          res.write(': connected\n\n');
          return subscribe(file, res);
        }
        const content = await readFile(file, 'utf8');
        return send(res, 200, JSON.stringify({ name: basename(file), content }), MIME['.json']);
      }
      if (name === 'styles.css') return send(res, 200, await readFile(STYLES), MIME['.css']);
      const asset = name.startsWith('fonts/')
        ? fileInRoot(join(HERE, 'fonts'), `/${name.slice('fonts/'.length)}`)
        : fileInRoot(VIEWER_DIR, `/${name}`);
      if (!asset) return send(res, 404, 'Not found');
      return send(res, 200, await readFile(asset), MIME[extname(asset)] ?? 'application/octet-stream');
    }

    const doc = docFor(target, url.pathname);
    const wantsHtml = (req.headers.accept ?? '').includes('text/html');
    if (doc && wantsHtml) return send(res, 200, pageHtml(basename(doc)), MIME['.html']);

    const file = fileInRoot(target.root, url.pathname);
    if (!file) return send(res, 404, 'Not found');
    const type = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
    // An SVG opened directly could run script in this origin; serve it as an image only.
    const headers = type === MIME['.svg'] ? { 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'" } : {};
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers });
    res.end(await readFile(file));
  }

  const server = createServer((req, res) => {
    handle(req, res).catch((err: unknown) => {
      if (!res.headersSent) send(res, 500, err instanceof Error ? err.message : String(err));
      else res.end();
    });
  });
  server.on('close', () => {
    for (const { watcher } of watchers.values()) watcher.close();
    watchers.clear();
  });
  return server;
}

function openBrowser(url: string) {
  const [cmd, args] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', url]]
        : ['xdg-open', [url]];
  const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
  child.on('error', () => console.log(`Open ${url} in your browser.`));
  child.unref();
}

export async function main(argv: string[]): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        port: { type: 'string', short: 'p' },
        'no-open': { type: 'boolean' },
        version: { type: 'boolean', short: 'v' },
        help: { type: 'boolean', short: 'h' },
      },
    });
  } catch (err) {
    console.error(`${err instanceof Error ? err.message : err}\n\n${USAGE}`);
    return 2;
  }
  const { values, positionals } = parsed;
  if (values.help) return console.log(USAGE), 0;
  if (values.version) return console.log(PKG.version), 0;
  if (positionals.length > 1) return console.error(USAGE), 2;

  const port = values.port === undefined ? 0 : Number(values.port);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error(`Invalid port: ${values.port}`);
    return 2;
  }

  let target: ResolvedTarget;
  try {
    target = resolveTarget(positionals[0], process.cwd());
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return 1;
  }

  const server = createViewerServer(target);
  await new Promise<void>((done, fail) => {
    server.once('error', fail);
    server.listen(port, '127.0.0.1', done);
  });
  const address = server.address();
  const url = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : port}/`;
  const shown = relative(process.cwd(), target.file);
  console.log(`Viewing ${shown.startsWith('..') ? target.file : shown} at ${url}  (Ctrl+C to stop)`);
  if (!values['no-open']) openBrowser(url);

  await new Promise<void>((done) => {
    const stop = () => {
      server.close(() => done());
      server.closeAllConnections();
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  });
  return 0;
}
