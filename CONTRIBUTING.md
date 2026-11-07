# Contributing

Thanks for helping! Bug reports, docs fixes and pull requests are all welcome.

## Reporting

- **Bugs and ideas**: open an [issue](https://github.com/mickey-ichi/react-llm-markdown/issues/new/choose) with the
  Markdown that shows the problem (the [playground](https://mickey-ichi.github.io/react-llm-markdown/) has a "Copy link"
  button that captures it).
- **Security issues**: never in a public issue — see [SECURITY.md](SECURITY.md).

## Setup

Node.js 22.18 or later (`nvm use` reads `.nvmrc`).

```bash
npm install
npx playwright install chromium   # once, for the end-to-end tests
```

| Command | What it does |
|---|---|
| `npm run build` | `dist/`: library, `styles.css`, CLI and its viewer bundle |
| `npm run typecheck` | TypeScript over `src/`, `test/`, `e2e/`, `site/` (after a build: tests import `dist/`) |
| `npm test` | Unit tests (`node --test`; React Native primitives are stubbed in `test/stubs/`) |
| `npm run e2e` | End-to-end in Chromium: web viewer, React Native example app, WebView documents, playground and docs |
| `npm run lint:package` | Checks the published package: `publint` and `are-the-types-wrong` |
| `npm run site` | Builds the playground and docs into `site-dist/` |
| `npm run docs:report` | Runs the e2e suite and rewrites `docs/test-report.md` |
| `npm run view -- file.md` | The CLI viewer, from source |

## Layout

| Path | |
|---|---|
| `src/core/` | DOM-free: parsing, streaming repair, every security policy. Both renderers use it. |
| `src/web/` | `MarkdownView` on Streamdown, the rehype URL policy, `styles.css` source |
| `src/native/` | React Native renderer, Shiki highlighter, WebView documents |
| `src/cli.ts`, `src/viewer/` | The `.md` viewer server and its page |
| `e2e-app/` | Expo app the React Native e2e tests drive |
| `examples/` | Next.js and React Native (Expo) example apps |
| `site/` | Playground and documentation (GitHub Pages) |
| `e2e/cases.ts` | Attack payloads and performance cases shared by every e2e suite |

## Pull requests

- One change per PR, with a test. A security fix needs a test that uses the input that showed the problem.
- Rendering changes should work on both renderers; if not, say why in the PR.
- Keep untrusted input untrusted: no `dangerouslySetInnerHTML`, no `eval`, no new URL schemes or HTML tags without a
  test in `test/security.test.ts` and an e2e payload in `e2e/cases.ts`.
- Update the docs (`README.md`, `site/docs/`, `docs/`) and `CHANGELOG.md` when users would notice the change.
- CI must be green: build, type check and unit tests on Linux, macOS and Windows, plus the e2e suite.

## Releasing (maintainers)

1. Update `CHANGELOG.md` and bump `version` in `package.json` (`npm version patch --no-git-tag-version`).
2. Merge to `main`.
3. Publish a GitHub Release with tag `vX.Y.Z`: `.github/workflows/release.yml` checks the tag, builds, tests and
   publishes to npm with Trusted Publishing and provenance. A GitHub pre-release goes to the `next` dist-tag.
