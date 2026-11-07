# CLI viewer

```bash
npx react-llm-markdown README.md
```

Opens a Markdown file in your browser, rendered by the web renderer, and reloads it every time you save. Useful for
reading model output saved to disk, or a project's docs with its diagrams and charts drawn.

## Usage

```bash
react-llm-markdown [file.md | folder] [options]
```

| | |
|---|---|
| `file.md` | The file to open. |
| `folder` | Opens its `README.md` (or `readme.md`, `README.markdown`, `index.md`). Default: the current folder. |
| `-p, --port <n>` | Port to listen on. Default: a free port. |
| `--no-open` | Print the URL instead of opening the browser. |
| `-v, --version` | Print the version. |
| `-h, --help` | Show help. |

Links to other `.md` files in the same folder open in the viewer too, and relative images load. Toggle light and dark
with the button in the top bar.

## Safety

- Listens on `127.0.0.1` only, and answers only requests addressed to `127.0.0.1` or `localhost` (so a web page cannot
  reach it through DNS rebinding).
- Serves files from the document's folder only — never `..`, symlinks out of it, or dotfiles such as `.env`.
- Renders with the same sanitizer as the library: HTML or links in the file cannot run script.

Requires Node.js 20 or later. The CLI needs none of the optional peers: `npx` is enough.
