import { describe, it } from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ALLOWED_URL_PROTOCOLS, ECHARTS_LIMITS, EChartsLimitError, KATEX_SECURITY_OPTIONS, MarkdownView, hardenEChartsOption, parseEChartsSource, sanitizeEChartsOption, sanitizeMarkdownUrl, stripMermaidConfigOverrides, stripMermaidSourceOverrides, stripProtocolRelativeMarkdownLinks, withKatexSecurity, withMermaidSourceGuard } from '../dist/web/index.js';
import { expect } from './expect.ts';

/**
 * XSS / injection suite. Raw HTML in Markdown is untrusted: Streamdown parses it (rehype-raw) and
 * then sanitizes it (rehype-sanitize), then the URL policy runs. These payloads prove nothing executable
 * survives. Mermaid and ECharts render only in the browser, so their policies are tested directly.
 */

const render = (content: string) =>
  renderToStaticMarkup(createElement(MarkdownView, { softBreaks: true, children: content }));

describe('MarkdownView XSS hardening (SSR output)', () => {
  it('strips a raw <script> tag', () => {
    const html = render('Hello\n\n<script>alert(1)</script>\n\nWorld');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(1)');
  });

  it('strips inline event handlers on raw <img>', () => {
    const html = render('<img src="x" onerror="alert(1)">');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('alert(1)');
  });

  it('drops javascript: link protocol', () => {
    const html = render('[click](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('alert(1)');
  });

  it('drops a protocol-relative link instead of keeping the host', () => {
    const html = render('[click](//evil.example/phish)');
    expect(html).not.toContain('evil.example');
    expect(html).not.toContain('href="//');
    expect(html).not.toContain('href="/phish"');
  });

  it('drops vbscript: link protocol', () => {
    const html = render('[click](vbscript:msgbox(1))');
    expect(html).not.toContain('vbscript:');
  });

  it('drops file: link protocol', () => {
    const html = render('[read](file:///etc/passwd)');
    expect(html).not.toContain('file:///');
  });

  it('strips a raw <iframe>', () => {
    const html = render('<iframe src="https://evil.example/x"></iframe>');
    expect(html).not.toContain('<iframe');
  });

  it('strips raw <style> and <meta>', () => {
    const html = render(
      '<style>body{display:none}</style>\n\n<meta http-equiv="refresh" content="0">',
    );
    expect(html).not.toContain('<style');
    expect(html).not.toContain('<meta');
  });

  it('drops a data:image/svg+xml image (SVG is a vector for script)', () => {
    const payload = 'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+';
    const html = render(`![x](${payload})`);
    expect(html).not.toContain('data:image/svg');
    expect(html).not.toContain('onload');
  });

  it('drops <picture><source srcset> so a data: or external image cannot bypass the img policy', () => {
    const html = render(
      '<picture><source srcset="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+"><source srcset="https://evil.example/p.png"><img src="https://example.com/x.png"></picture>',
    );
    expect(html).not.toContain('<source');
    expect(html).not.toContain('data:image');
    expect(html).not.toContain('evil.example');
    expect(html).toContain('src="https://example.com/x.png"');
  });

  it('opens external links with referrerPolicy no-referrer', () => {
    const html = render('[Example](https://example.com)');
    expect(html).toContain('referrerPolicy="no-referrer"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });

  it('proves raw-before-sanitize ordering: allowed raw tag survives, dangerous one does not', () => {
    // <sub> is on the allowlist; <script> is not. The allowed one surviving while the dangerous
    // one is stripped means rehype-raw parsed the HTML first and rehype-sanitize filtered it after.
    const html = render('H<sub>2</sub>O <script>alert(1)</script>');
    expect(html).toContain('<sub'); // allowed raw tag rendered (may carry Streamdown classes)
    expect(html).toContain('2</sub>');
    expect(html).not.toContain('<script');
  });

  it('renders <mark> highlight through sanitization', () => {
    const html = render('Normal <mark>highlighted</mark> text');
    expect(html).toContain('<mark');
    expect(html).toContain('highlighted</mark>');
  });

  it('still renders benign markdown intact', () => {
    const html = render('# Title\n\n**bold** and a [safe link](https://example.com)');
    expect(html).toContain('Title');
    expect(html).toContain('data-streamdown="strong"');
    expect(html).toContain('https://example.com');
  });
});

describe('sanitizeMarkdownUrl policy', () => {
  it('allows only http/https/mailto absolute protocols', () => {
    expect(ALLOWED_URL_PROTOCOLS).toEqual(['http:', 'https:', 'mailto:']);
    expect(sanitizeMarkdownUrl('https://example.com')).toBe('https://example.com');
    expect(sanitizeMarkdownUrl('http://example.com')).toBe('http://example.com');
    expect(sanitizeMarkdownUrl('mailto:a@b.com')).toBe('mailto:a@b.com');
  });

  it('drops dangerous protocols', () => {
    expect(sanitizeMarkdownUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeMarkdownUrl('vbscript:x')).toBeNull();
    expect(sanitizeMarkdownUrl('file:///etc/passwd')).toBeNull();
    expect(sanitizeMarkdownUrl('data:image/svg+xml,x')).toBeNull();
  });

  it('drops protocol-relative URLs that would skip the scheme allowlist', () => {
    expect(sanitizeMarkdownUrl('//evil.example/phish')).toBeNull();
    expect(sanitizeMarkdownUrl('///evil.example')).toBeNull();
    expect(sanitizeMarkdownUrl('  //evil.example')).toBeNull();
  });

  it('rewrites protocol-relative markdown destinations before Streamdown harden', () => {
    expect(stripProtocolRelativeMarkdownLinks('[click](//evil.example/phish)')).toBe('[click](#)');
    expect(stripProtocolRelativeMarkdownLinks('![x](//evil.example/a.png)')).toBe('![x](#)');
    expect(stripProtocolRelativeMarkdownLinks('```\n[click](//evil.example/phish)\n```')).toBe(
      '```\n[click](//evil.example/phish)\n```',
    );
  });

  it('preserves relative, absolute-path and anchor URLs', () => {
    expect(sanitizeMarkdownUrl('/path')).toBe('/path');
    expect(sanitizeMarkdownUrl('#anchor')).toBe('#anchor');
    expect(sanitizeMarkdownUrl('./rel')).toBe('./rel');
    expect(sanitizeMarkdownUrl('../up')).toBe('../up');
  });

  it('handles case-insensitive and padded protocol tricks', () => {
    expect(sanitizeMarkdownUrl('  JavaScript:alert(1)')).toBeNull();
    expect(sanitizeMarkdownUrl('HTTPS://example.com')).toBe('HTTPS://example.com');
  });
});

describe('sanitizeEChartsOption defense-in-depth', () => {
  it('strips function values but keeps template strings and data', () => {
    const input = {
      tooltip: { formatter: () => 'pwned' }, // function must be removed
      xAxis: { data: ['Mon', 'Tue'] },
      series: [{ type: 'bar', data: [1, 2, 3], label: { formatter: '{c}' } }], // string kept
    };
    const cleaned = sanitizeEChartsOption(input) as typeof input;
    expect(cleaned.tooltip).toEqual({}); // formatter function stripped
    expect(cleaned.xAxis.data).toEqual(['Mon', 'Tue']);
    expect(cleaned.series[0]?.label.formatter).toBe('{c}');
  });

  it('strips functions nested in arrays', () => {
    const cleaned = sanitizeEChartsOption([1, () => 2, { f: () => 3, keep: 4 }]) as unknown[];
    expect(cleaned).toEqual([1, { keep: 4 }]);
  });

  it('strips HTML markup from string values but keeps template placeholders', () => {
    const input = {
      title: { text: '<img src=x onerror=alert(document.cookie)>Sales' },
      tooltip: { formatter: '{b}: {c}' },
      series: [{ type: 'bar', data: [1], label: { formatter: '<b>{c}</b>' } }],
    };
    const cleaned = sanitizeEChartsOption(input) as typeof input;
    expect(cleaned.title.text).toBe('Sales'); // injected <img onerror> removed
    expect(cleaned.tooltip.formatter).toBe('{b}: {c}'); // placeholder preserved
    expect(cleaned.series[0]?.label.formatter).toBe('{c}'); // tags stripped, text kept
  });
});

describe('hardenEChartsOption', () => {
  it('neutralizes a tooltip HTML-injection payload before setOption', () => {
    const payload = {
      tooltip: { formatter: '<img src=x onerror=alert(document.cookie)>' },
      xAxis: { data: ['a'] },
      series: [{ type: 'bar', data: [1] }],
    };
    const hardened = hardenEChartsOption(payload) as {
      tooltip: { formatter: string; renderMode: string };
    };
    // HTML stripped from the formatter string...
    expect(hardened.tooltip.formatter).not.toContain('<');
    expect(hardened.tooltip.formatter).not.toContain('onerror');
    // ...and tooltip forced to richText so ECharts never renders formatter as HTML.
    expect(hardened.tooltip.renderMode).toBe('richText');
  });

  it('forces tooltip richText even when the payload omits renderMode', () => {
    const hardened = hardenEChartsOption({ tooltip: {}, series: [] }) as {
      tooltip: { renderMode: string };
    };
    expect(hardened.tooltip.renderMode).toBe('richText');
  });

  it('passes through non-object options unchanged', () => {
    expect(hardenEChartsOption(null)).toBeNull();
    expect(hardenEChartsOption([1, 2])).toEqual([1, 2]);
  });

  // An unclosed tag has no `>` of its own; ECharts' tooltip markup appended after the
  // formatter output (`<div style="…">`) would close it and create a live element.
  it('removes stray angle brackets from an unclosed tag', () => {
    const cleaned = sanitizeEChartsOption({
      tooltip: { formatter: "<img src=x onerror=alert('T4') {b}" },
    }) as { tooltip: { formatter: string } };
    expect(cleaned.tooltip.formatter).not.toMatch(/[<>]/);
    expect(cleaned.tooltip.formatter).toContain('{b}');
  });

  it('forces richText on every entry of an array tooltip (T4)', () => {
    const hardened = hardenEChartsOption({
      tooltip: [{ trigger: 'item', formatter: "<img src=x onerror=alert('T4') {b}" }, {}],
      xAxis: { type: 'category', data: ['A', 'B'] },
      series: [{ type: 'bar', data: [10, 20] }],
    }) as { tooltip: { formatter?: string; renderMode: string }[] };
    expect(hardened.tooltip).toHaveLength(2);
    for (const entry of hardened.tooltip) expect(entry.renderMode).toBe('richText');
    expect(hardened.tooltip[0]?.formatter).not.toMatch(/[<>]/);
  });

  it('forces richText on series- and data-level tooltips (T5)', () => {
    const hardened = hardenEChartsOption({
      tooltip: [{ trigger: 'item' }],
      legend: { tooltip: { show: true } },
      series: [
        {
          type: 'bar',
          tooltip: { formatter: "<img src=x onerror=alert('T5') {b}" },
          data: [{ value: 10, tooltip: { formatter: '<svg onload=alert(1) {c}' } }, 20],
        },
      ],
    }) as {
      legend: { tooltip: { renderMode: string } };
      series: {
        tooltip: { formatter: string; renderMode: string };
        data: ({ tooltip: { formatter: string; renderMode: string } } | number)[];
      }[];
    };
    const series = hardened.series[0]!;
    expect(series.tooltip.renderMode).toBe('richText');
    expect(series.tooltip.formatter).not.toMatch(/[<>]/);
    const point = series.data[0] as { tooltip: { formatter: string; renderMode: string } };
    expect(point.tooltip.renderMode).toBe('richText');
    expect(point.tooltip.formatter).not.toMatch(/[<>]/);
    expect(series.data[1]).toBe(20);
    expect(hardened.legend.tooltip.renderMode).toBe('richText');
  });
});

describe('KaTeX security options', () => {
  it('passes trust:false, maxExpand and maxSize to rehype-katex explicitly', () => {
    const rehypeKatex = () => undefined;
    const plugin = withKatexSecurity({
      name: 'katex',
      rehypePlugin: [rehypeKatex, { errorColor: 'gray' }],
    });
    expect(plugin.rehypePlugin).toEqual([
      rehypeKatex,
      { errorColor: 'gray', trust: false, maxExpand: 1000, maxSize: 20 },
    ]);
    expect(KATEX_SECURITY_OPTIONS.trust).toBe(false);
  });

  it('allows the extra tags LLMs emit: details / summary / sub / sup / mark', () => {
    const html = render('<details><summary>More</summary>\n\nHidden <sub>a</sub><sup>b</sup><mark>c</mark>\n\n</details>');
    for (const tag of ['<details', '<summary', '<sub', '<sup', '<mark']) expect(html).toContain(tag);
  });

  it('cannot build a fake form: <form> and <button> go, <input> is forced to a disabled checkbox', () => {
    const html = render('<form action="https://evil.example"><input type="password" name="pw"><button>Send</button></form>');
    for (const tag of ['<form', '<button', 'evil.example', 'type="password"']) expect(html).not.toContain(tag);
    // GitHub's sanitize schema keeps <input> only for task lists: disabled, type="checkbox".
    for (const input of html.match(/<input[^>]*>/g) ?? []) {
      expect(input).toContain('disabled');
      expect(input).toContain('type="checkbox"');
    }
  });

  it('does not crash on a macro-expansion-bomb payload during SSR', () => {
    const bomb = '$$\\def\\a{\\b\\b}\\def\\b{\\a\\a}\\a$$';
    expect(() => render(bomb)).not.toThrow();
  });
});

describe('ECharts option allowlist and limits', () => {
  it('removes title link / sublink / target so a javascript: URL cannot run on click', () => {
    const hardened = hardenEChartsOption({
      title: {
        text: 'Sales',
        link: 'javascript:alert(1)',
        target: 'self',
        sublink: 'javascript:x',
        subtext: 'FY',
      },
      series: [{ type: 'bar', data: [1] }],
    }) as { title: Record<string, unknown> };
    expect(hardened.title).toEqual({ text: 'Sales', subtext: 'FY' });
  });

  it('removes link keys from every title of an array title', () => {
    const hardened = hardenEChartsOption({
      title: [
        { text: 'A', link: 'javascript:1' },
        { text: 'B', sublink: 'javascript:2' },
      ],
      series: [],
    }) as { title: Record<string, unknown>[] };
    expect(hardened.title).toEqual([{ text: 'A' }, { text: 'B' }]);
  });

  it('drops option keys outside the allowlist (graphic, toolbox, media, options, geo)', () => {
    const hardened = hardenEChartsOption({
      graphic: [{ type: 'image', style: { image: 'https://evil.example/x.png' } }],
      toolbox: { feature: { dataView: {}, saveAsImage: {} } },
      media: [{ option: { graphic: [] } }],
      options: [{}],
      geo: { map: 'world' },
      series: [{ type: 'bar', data: [1] }],
    }) as Record<string, unknown>;
    expect(Object.keys(hardened).sort()).toEqual(['series']);
  });

  it('drops series types outside the allowlist (custom, pictorialBar, map)', () => {
    const hardened = hardenEChartsOption({
      series: [
        { type: 'bar', data: [1] },
        { type: 'custom', data: [1] },
        { type: 'pictorialBar', symbol: 'image://https://evil.example/x.png', data: [1] },
        { type: 'map', map: 'world' },
        { data: [1] },
      ],
    }) as { series: { type: string }[] };
    expect(hardened.series.map((s) => s.type)).toEqual(['bar']);
  });

  it('removes image:// symbols, url() values and image / extraCssText keys at any depth', () => {
    const hardened = hardenEChartsOption({
      backgroundColor: { image: 'https://evil.example/bg.png', repeat: 'repeat' },
      series: [
        {
          type: 'scatter',
          symbol: 'image://https://evil.example/x.png',
          label: { rich: { a: { backgroundColor: { image: 'data:image/png;base64,AAAA' } } } },
          itemStyle: { color: 'url(https://evil.example/x)' },
          data: [[1, 2]],
        },
      ],
      tooltip: { extraCssText: 'background:url(https://evil.example/t)' },
    });
    const json = JSON.stringify(hardened);
    expect(json).not.toContain('evil.example');
    expect(json).not.toContain('data:image');
    expect(json).not.toContain('extraCssText');
  });

  for (const type of ['treemap', 'sunburst']) {
    it(`removes data-item links from ${type} so nodeClick cannot open javascript:`, () => {
      const hardened = hardenEChartsOption({
        series: [
          {
            type,
            nodeClick: 'link',
            data: [
              {
                name: 'a',
                value: 1,
                link: 'javascript:alert(document.domain)',
                target: '_self',
                children: [{ name: 'b', value: 1, link: 'javascript:alert(2)' }],
              },
            ],
          },
        ],
      }) as { series: Record<string, unknown>[] };
      const json = JSON.stringify(hardened);
      expect(json).not.toContain('javascript:');
      expect(json).not.toContain('"link"');
      expect(hardened.series[0]?.nodeClick).toBe(false);
    });
  }

  it('keeps sankey / graph link ends (`target` is only blocked inside title)', () => {
    const option = {
      series: [
        {
          type: 'sankey',
          data: [{ name: 'a' }, { name: 'b' }],
          links: [{ source: 'a', target: 'b', value: 1 }],
        },
      ],
    };
    expect(hardenEChartsOption(option)).toEqual(option);
  });

  it('refuses a source longer than the limit before parsing it', () => {
    const huge = `{"series":[{"type":"bar","data":[${'1,'.repeat(ECHARTS_LIMITS.maxSourceLength)}1]}]}`;
    expect(() => parseEChartsSource(huge)).toThrow(EChartsLimitError);
  });

  it('refuses too many series and too many data points', () => {
    const series = Array.from({ length: ECHARTS_LIMITS.maxSeries + 1 }, () => ({
      type: 'line',
      data: [1],
    }));
    expect(() => hardenEChartsOption({ series })).toThrow(EChartsLimitError);
    const data = Array.from({ length: ECHARTS_LIMITS.maxDataPoints + 1 }, (_, i) => i);
    expect(() => hardenEChartsOption({ series: [{ type: 'line', data }] })).toThrow(
      EChartsLimitError,
    );
    const source = Array.from({ length: ECHARTS_LIMITS.maxDataPoints + 1 }, (_, i) => [i, i]);
    expect(() => hardenEChartsOption({ dataset: { source }, series: [{ type: 'line' }] })).toThrow(
      EChartsLimitError,
    );
  });

  it('keeps axisPointer.link (axis indexes, not a URL) for synchronized pointers', () => {
    const option = {
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      xAxis: [{ type: 'category', data: ['a'] }],
      yAxis: [{}],
      series: [{ type: 'line', data: [1] }],
    };
    expect(hardenEChartsOption(option)).toEqual(option);
  });

  it('keeps the coordinate systems themeRiver, parallel and calendar heatmaps need', () => {
    const option = {
      singleAxis: { type: 'time' },
      parallel: { left: 40 },
      parallelAxis: [{ dim: 0, name: 'a' }],
      calendar: { range: '2026' },
      series: [
        { type: 'themeRiver', data: [['2026-01-01', 1, 'a']] },
        { type: 'parallel', data: [[1]] },
        { type: 'heatmap', coordinateSystem: 'calendar', data: [['2026-01-01', 1]] },
      ],
    };
    expect(hardenEChartsOption(option)).toEqual(option);
  });

  it('counts graph nodes / links / edges and nested children toward the data-point limit', () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `n${i}` }));
    expect(() =>
      hardenEChartsOption({ series: [{ type: 'graph', layout: 'force', nodes: many(30_000) }] }),
    ).toThrow(EChartsLimitError);
    expect(() =>
      hardenEChartsOption({
        series: [{ type: 'graph', nodes: many(10_001), edges: many(10_001) }],
      }),
    ).toThrow(EChartsLimitError);
    expect(() =>
      hardenEChartsOption({
        series: [{ type: 'sankey', data: many(10_001), links: many(10_001) }],
      }),
    ).toThrow(EChartsLimitError);
    const nested = [{ name: 'root', children: [{ name: 'mid', children: many(20_001) }] }];
    expect(() => hardenEChartsOption({ series: [{ type: 'treemap', data: nested }] })).toThrow(
      EChartsLimitError,
    );
    expect(() =>
      hardenEChartsOption({ series: [{ type: 'graph', nodes: many(100), links: many(100) }] }),
    ).not.toThrow();
  });

  it('refuses JSON that is not an option object (null, arrays, numbers)', () => {
    for (const source of ['null', '[1, 2]', '42', '"text"']) expect(() => parseEChartsSource(source)).toThrow(TypeError);
  });

  it('still rejects a fence with function-like JavaScript (not JSON)', () => {
    expect(() =>
      parseEChartsSource('{"series":[{"type":"bar","data":[1]}],"x":function(){alert(1)}}'),
    ).toThrow();
  });
});

describe('common chart options pass through unchanged', () => {
  const cases: [string, Record<string, unknown>][] = [
    [
      'bar chart with title / subtitle / legend / axes / template tooltip',
      {
        title: { text: 'Monthly sales', subtext: '2026', left: 'center' },
        legend: { data: ['Sales', 'Target'], bottom: 0 },
        tooltip: { trigger: 'axis', formatter: '{b}: {c}' },
        grid: { left: 40, right: 20 },
        xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar'], name: 'Month' },
        yAxis: { type: 'value', name: 'USD' },
        color: ['#5470c6', '#91cc75'],
        series: [
          { name: 'Sales', type: 'bar', data: [120, 200, 150], label: { show: true } },
          { name: 'Target', type: 'line', data: [150, 150, 150], smooth: true },
        ],
      },
    ],
    [
      'pie chart',
      {
        title: { text: 'Share' },
        tooltip: { trigger: 'item' },
        series: [
          {
            type: 'pie',
            radius: '50%',
            data: [
              { name: 'A', value: 1 },
              { name: 'B', value: 2 },
            ],
          },
        ],
      },
    ],
    [
      'dataset + dataZoom + visualMap',
      {
        dataset: {
          source: [
            ['d', 'v'],
            ['a', 1],
            ['b', 2],
          ],
        },
        dataZoom: [{ type: 'inside' }],
        visualMap: { min: 0, max: 10 },
        xAxis: { type: 'category' },
        yAxis: {},
        series: [{ type: 'bar' }],
      },
    ],
  ];
  for (const [label, option] of cases) {
    it(label, () => {
      const hardened = hardenEChartsOption(option) as Record<string, unknown>;
      const expected: Record<string, unknown> = { ...option };
      if ('tooltip' in option) expected.tooltip = { ...(option.tooltip as object), renderMode: 'richText' };
      expect(hardened).toEqual(expected);
    });
  }

  it('leaves a Mermaid flowchart without directives unchanged', () => {
    const md = ['```mermaid', 'flowchart LR', '  A[Client] --> B[Server]', '```'].join('\n');
    expect(stripMermaidConfigOverrides(md)).toBe(md);
  });
});

describe('Mermaid config overrides are removed', () => {
  it('drops a %%{init}%% directive that would turn htmlLabels back on', () => {
    const md = [
      '```mermaid',
      "%%{init: {'securityLevel': 'loose', 'flowchart': {'htmlLabels': true}}}%%",
      'flowchart LR',
      '  A["<img src=x onerror=alert(1)>"] --> B',
      '```',
    ].join('\n');
    const out = stripMermaidConfigOverrides(md);
    expect(out).not.toContain('%%{');
    expect(out).not.toContain('htmlLabels');
    expect(out).toContain('flowchart LR');
  });

  it('drops a leading frontmatter config block', () => {
    const md = [
      '```mermaid',
      '---',
      'config:',
      '  securityLevel: loose',
      '---',
      'graph TD',
      '  A-->B',
      '```',
    ].join('\n');
    const out = stripMermaidConfigOverrides(md);
    expect(out).not.toContain('securityLevel');
    expect(out).toContain('graph TD');
  });

  it('removes a directive reassembled around a removed one', () => {
    const source =
      '%%%%{x}%%{init: {"flowchart": {"htmlLabels": true}}}%%\nflowchart LR\n  A --> B';
    const out = stripMermaidSourceOverrides(source);
    expect(out).not.toContain('%%{');
    expect(out).not.toContain('htmlLabels');
    expect(out).toContain('flowchart LR');
  });

  it('removes an unclosed directive left after stripping', () => {
    const out = stripMermaidSourceOverrides(
      '%%%%{{init: {"flowchart": {"htmlLabels": true}}\nflowchart LR\n  A --> B',
    );
    expect(out).not.toContain('%%{');
    expect(out).toContain('flowchart LR');
  });

  it('strips directives from the code Mermaid renders, wherever the fence sat (blockquote)', async () => {
    const rendered: string[] = [];
    const plugin = withMermaidSourceGuard({
      name: 'mermaid',
      type: 'diagram',
      language: 'mermaid',
      getMermaid: () => ({
        initialize: () => undefined,
        render: async (_id: string, source: string) => {
          rendered.push(source);
          return { svg: '' };
        },
      }),
    });
    // A `> ```mermaid` fence is not matched by the Markdown pass; the render guard still runs.
    await plugin
      .getMermaid()
      .render('m1', '%%{init: {"flowchart": {"htmlLabels": true}}}%%\nflowchart LR\n  A --> B');
    expect(rendered[0]).not.toContain('%%{');
    expect(rendered[0]).toContain('flowchart LR');
  });

  it('leaves %%{ outside a mermaid fence alone', () => {
    const md = ['Text %%{init}%%', '```js', "const x = '%%{init}%%';", '```'].join('\n');
    expect(stripMermaidConfigOverrides(md)).toBe(md);
  });
});
