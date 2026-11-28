# react-llm-markdown-viewer

```bash
npx react-llm-markdown-viewer README.md
```

Opens a Markdown file in your browser and reloads it every time you save — rendered by
[react-llm-markdown](https://github.com/mickey-ichi/react-llm-markdown): GFM, code highlighting, math, Mermaid
diagrams and ECharts charts, with the same sanitizer as the library.

```bash
react-llm-markdown-viewer [file.md | folder] [options]
```

| | |
|---|---|
| `file.md` | The file to open. |
| `folder` | Opens its `README.md` (or `readme.md`, `README.markdown`, `index.md`). Default: the current folder. |
| `-p, --port <n>` | Port to listen on. Default: a free port. |
| `--no-open` | Print the URL instead of opening the browser. |
| `-v, --version` | Print the version. |
| `-h, --help` | Show help. |

- Listens on `127.0.0.1` only and answers only requests addressed to `127.0.0.1` or `localhost`.
- Serves files from the document's folder only — never `..`, symlinks out of it, or dotfiles such as `.env`.
- No runtime dependencies: the browser app is prebuilt. Requires Node.js 20 or later.

The browser bundle includes third-party packages; their licenses are in `dist/viewer/THIRD_PARTY_LICENSES.txt`.

[MIT](https://github.com/mickey-ichi/react-llm-markdown/blob/main/LICENSE) © mickey-ichi
