# Security policy

react-llm-markdown renders Markdown written by language models and users, so it treats that input as untrusted.
Security reports are taken seriously.

## Reporting a vulnerability

Please **do not open a public issue**. Report it privately through
[GitHub Security Advisories](https://github.com/mickey-ichi/react-llm-markdown/security/advisories/new)
("Report a vulnerability"). You'll get a reply within a few days; once fixed, a patched release and an advisory are
published, with credit if you want it.

Especially in scope:

- Script execution or HTML injection from Markdown content (raw HTML, links, images, math, Mermaid, ECharts fences)
- Bypassing the URL allowlist, the Mermaid or KaTeX settings, or the ECharts option allowlist and limits
- Markdown that freezes or crashes the page
- The CLI viewer serving files outside the document's folder, dotfiles, or listening beyond `127.0.0.1`

## Supported versions

Only the latest release receives fixes.

## How the project is checked

- CI runs the build, the type check and the unit tests (including an XSS payload suite) on Linux, macOS and Windows.
- CI runs the end-to-end suite in Chromium: 27 attack payloads against the web renderer, the React Native renderer
  and the WebView documents (no script runs, no request reaches the attacker's host, no navigation), plus performance
  budgets for long text, large tables, many charts, large charts and repeated rendering.
- Dependabot keeps dependencies and GitHub Actions current; actions are pinned by commit SHA.
- npm releases are published from CI with Trusted Publishing and provenance. (0.1.0, the first, was published from a
  local build of the tagged commit to create the package; it has no provenance.)
