# Performance

A chat answer can be long, contain a big table or dozens of charts, and the same answer is shown again and again as
people scroll through history. react-llm-markdown is checked against these cases in a real browser on every run of
`npm run e2e`; the numbers below come from [test-report.md](test-report.md).

## Budget

| | Budget |
|---|---|
| Render | The whole document is on screen within **5 s**. |
| Responsiveness | Right after rendering, typing into a text field shows up within **0.5 s** (the page does not freeze). |
| Repeated display | Showing the same answer 5 times does not get slower and does not keep memory. |

## Cases

| ID | Input |
|---|---|
| PERF-01 | Long text: about 200 KB, 2,000 headings and paragraphs with bold, inline code and links. |
| PERF-02 | Large table: 1,000 rows × 10 columns. |
| PERF-03 | Many rich blocks: 20 ECharts charts and 10 Mermaid diagrams. |
| PERF-04 | Large chart: one ECharts line chart at the 20,000-point limit. |
| PERF-05 | Repeated display: a 200-row table, a chart and a diagram, rendered 5 times in the same page. |

## Results

One run on an Apple M2 in Chromium (Playwright); timings vary by a few tens of milliseconds between runs, and
[test-report.md](test-report.md) always has the latest. "Longest task" is the longest time the main thread was busy
without a break (Long Tasks API).

| Case | Web: render / longest task / typing | React Native: render / longest task / typing |
|---|---|---|
| PERF-01 Long text | 0.48 s / 0.32 s / 0.02 s | 0.47 s / 0.27 s / 0.01 s |
| PERF-02 Table 1,000 × 10 | 0.34 s / 0.20 s / 0.01 s | 0.52 s / 0.30 s / 0.01 s |
| PERF-03 20 charts + 10 diagrams | 0.25 s / 0.05 s / 0.01 s | 0.12 s (source shown) |
| PERF-04 20,000-point chart | 0.23 s / 0.00 s / 0.01 s | 0.14 s (source shown) |
| PERF-05 Same answer × 5 | 0.10–0.18 s each, heap flat at 14 MB | 0.05–0.09 s each, heap flat at 21 MB |

All within budget. Notes:

- **Large charts** get ECharts' large-data defaults when a series has more than 2,000 points: line series are sampled
  with LTTB (the same shape on screen), per-point symbols are hidden and animation is off — unless the option sets
  them itself. This took typing latency right after a 20,000-point chart from about 0.5 s to 0.01 s.
- **React Native** is measured on the example app built for the web (react-native-web), so it shows the renderer's own
  cost — parsing, layout of native views, Shiki highlighting — but not Hermes on a phone, and not WebView drawing:
  without `react-native-webview` on the web, charts and diagrams show their source (hence the low PERF-03/04 numbers).
- On the web, Shiki, KaTeX, Mermaid and ECharts are loaded on demand, after the first paint; the first document on a
  page pays that download once.

## How it is measured

[e2e/web-security-perf.spec.ts](../e2e/web-security-perf.spec.ts) and
[e2e/native-security-perf.spec.ts](../e2e/native-security-perf.spec.ts):

1. Start collecting Long Tasks before the page loads.
2. Write the document, open it, and stop the clock when its last line (and, on the web, the last chart canvas) is in
   the DOM.
3. Add a text field outside the view and time typing two characters into it.
4. PERF-05: render the same document 5 times in the same page (live reload on the web, a remount in the app) and read
   the JS heap after each.

Run it yourself:

```bash
npx playwright install chromium   # once
npm run docs:report               # runs the suite and rewrites docs/test-report.md
```

CI runs the same suite with `PERF_BUDGET_SCALE=3`, because shared runners are several times slower than a laptop; it
catches regressions, while the numbers above are measured locally.
