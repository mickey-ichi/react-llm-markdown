/**
 * Hardening for ```echarts fences. ECharts renders outside the Markdown sanitizer and inserts
 * formatter / label strings into the DOM as HTML, so an option written by an LLM is untrusted.
 *
 * Pipeline: `JSON.parse` (never `eval`) → strip functions and HTML from strings → option-key and
 * series-type allowlists → blocked keys and URL values → size limits → tooltips forced to richText.
 */

type UnknownRecord = Record<string, unknown>;

export const isPlainRecord = (value: unknown): value is UnknownRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Size limits. Above any of them the chart is not drawn and the JSON is shown instead, so a huge
 * option cannot freeze the page. Generous for business charts.
 */
export const ECHARTS_LIMITS = {
  /** Characters of the fence body; 20,000 `[x, y]` points ≈ 0.5 MB. */
  maxSourceLength: 1_000_000,
  maxSeries: 50,
  /** Data items across every `series[].data` / `nodes` / `links` / `edges` and `dataset.source`. */
  maxDataPoints: 20_000,
} as const;

/**
 * Top-level option keys a fence may use. Everything else is dropped — notably `graphic` (arbitrary
 * shapes and images), `toolbox` (`dataView` renders HTML), `brush`, `geo` and `media` / `options`
 * (alternate option sets that would bypass this list).
 */
export const ECHARTS_ALLOWED_OPTION_KEYS = new Set([
  'title',
  'legend',
  'grid',
  'xAxis',
  'yAxis',
  'polar',
  'radiusAxis',
  'angleAxis',
  'radar',
  'singleAxis',
  'parallel',
  'parallelAxis',
  'calendar',
  'dataZoom',
  'visualMap',
  'tooltip',
  'axisPointer',
  'dataset',
  'series',
  'color',
  'backgroundColor',
  'textStyle',
  'animation',
  'animationDuration',
  'animationEasing',
  'darkMode',
  'aria',
]);

/** Series types a fence may draw. `custom` (`renderItem`), `pictorialBar` (image symbols),
 * `map` / `lines` (geo registration) and unknown types are dropped. */
export const ECHARTS_ALLOWED_SERIES_TYPES = new Set([
  'line',
  'bar',
  'pie',
  'scatter',
  'effectScatter',
  'radar',
  'funnel',
  'gauge',
  'heatmap',
  'boxplot',
  'candlestick',
  'treemap',
  'sunburst',
  'sankey',
  'graph',
  'tree',
  'parallel',
  'themeRiver',
]);

/**
 * Keys removed at any depth. `image` / `extraCssText` fetch URLs or inject CSS; `renderMode` is
 * forced afterwards; a string `link` / `sublink` is opened with `window.open` on click (title,
 * treemap / sunburst nodes), so a `javascript:` link would run. An array `link`
 * (`axisPointer.link`, axis indexes) is kept.
 */
const ECHARTS_BLOCKED_KEYS = new Set(['image', 'extraCssText', 'renderMode', 'link', 'sublink']);

/** Link targets removed from `title` only — `target` is also the edge end of sankey / graph links. */
const ECHARTS_TITLE_BLOCKED_KEYS = new Set(['link', 'sublink', 'target', 'subtarget']);

/** String values that make ECharts fetch a URL (`symbol: 'image://…'`, `url(…)`). */
const ECHARTS_URL_VALUE_PATTERN = /^\s*(image:\/\/|url\()/i;

/** Thrown when an option exceeds {@link ECHARTS_LIMITS}; the block then shows the JSON. */
export class EChartsLimitError extends Error {}

/**
 * Removes complete tags first so their inner text survives (`<b>{c}</b>` → `{c}`), then every
 * stray `<` / `>`: an unclosed `<img src=x onerror=…` would otherwise be closed by the markup
 * ECharts appends after the formatter output.
 */
function stripHtmlFromString(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
}

/** Drops function values and strips HTML from every string, at any depth. */
export function sanitizeEChartsOption(value: unknown): unknown {
  if (typeof value === 'function') return undefined;
  if (typeof value === 'string') return stripHtmlFromString(value);
  if (Array.isArray(value)) {
    return value.map(sanitizeEChartsOption).filter((item) => item !== undefined);
  }
  if (value !== null && typeof value === 'object') {
    const result: UnknownRecord = {};
    for (const [key, item] of Object.entries(value)) {
      const cleaned = sanitizeEChartsOption(item);
      if (cleaned !== undefined) result[key] = cleaned;
    }
    return result;
  }
  return value;
}

function forceRichTextTooltip(tooltip: unknown): unknown {
  if (Array.isArray(tooltip)) {
    return tooltip.map((entry) => (isPlainRecord(entry) ? { ...entry, renderMode: 'richText' } : entry));
  }
  if (isPlainRecord(tooltip)) return { ...tooltip, renderMode: 'richText' };
  return tooltip;
}

/** Forces `renderMode: 'richText'` on every `tooltip` key at any depth (top level, series, data). */
function forceRichTextTooltips(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(forceRichTextTooltips);
  if (!isPlainRecord(value)) return value;
  const result: UnknownRecord = {};
  for (const [key, item] of Object.entries(value)) {
    const walked = forceRichTextTooltips(item);
    result[key] = key === 'tooltip' ? forceRichTextTooltip(walked) : walked;
  }
  return result;
}

function withoutTitleLinks(title: unknown): unknown {
  const strip = (entry: unknown) =>
    isPlainRecord(entry)
      ? Object.fromEntries(Object.entries(entry).filter(([key]) => !ECHARTS_TITLE_BLOCKED_KEYS.has(key)))
      : entry;
  return Array.isArray(title) ? title.map(strip) : strip(title);
}

function stripBlockedEChartsKeys(value: unknown): unknown {
  if (typeof value === 'string') return ECHARTS_URL_VALUE_PATTERN.test(value) ? undefined : value;
  if (Array.isArray(value)) {
    return value.map(stripBlockedEChartsKeys).filter((item) => item !== undefined);
  }
  if (!isPlainRecord(value)) return value;
  const result: UnknownRecord = {};
  for (const [key, item] of Object.entries(value)) {
    if (ECHARTS_BLOCKED_KEYS.has(key) && !(key === 'link' && Array.isArray(item))) continue;
    // With the links gone, `nodeClick: 'link'` would open nothing; disable it.
    if (key === 'nodeClick' && item === 'link') {
      result[key] = false;
      continue;
    }
    const cleaned = stripBlockedEChartsKeys(item);
    if (cleaned !== undefined) result[key] = cleaned;
  }
  return result;
}

function allowedSeries(series: unknown): unknown {
  const list = Array.isArray(series) ? series : [series];
  return list.filter(
    (entry) =>
      isPlainRecord(entry) && typeof entry.type === 'string' && ECHARTS_ALLOWED_SERIES_TYPES.has(entry.type),
  );
}

/** Items of a data list, including nested `children` (treemap / sunburst / tree). */
function countItems(list: unknown): number {
  if (!Array.isArray(list)) return 0;
  let total = list.length;
  for (const item of list) {
    if (isPlainRecord(item)) total += countItems(item.children);
  }
  return total;
}

function countDataPoints(option: UnknownRecord): number {
  let total = 0;
  const series = Array.isArray(option.series) ? option.series : [];
  for (const entry of series) {
    if (!isPlainRecord(entry)) continue;
    for (const key of ['data', 'nodes', 'links', 'edges']) total += countItems(entry[key]);
  }
  const datasets = Array.isArray(option.dataset) ? option.dataset : [option.dataset];
  for (const dataset of datasets) {
    if (isPlainRecord(dataset) && Array.isArray(dataset.source)) total += dataset.source.length;
  }
  return total;
}

/**
 * Applies the option / series allowlists and the blocked keys / URL values, then checks
 * {@link ECHARTS_LIMITS}.
 * @throws {EChartsLimitError} when the option has too many series or data points
 */
export function restrictEChartsOption(option: UnknownRecord): UnknownRecord {
  const restricted: UnknownRecord = {};
  for (const [key, item] of Object.entries(option)) {
    if (!ECHARTS_ALLOWED_OPTION_KEYS.has(key)) continue;
    restricted[key] = key === 'series' ? allowedSeries(item) : key === 'title' ? withoutTitleLinks(item) : item;
  }
  const stripped = stripBlockedEChartsKeys(restricted) as UnknownRecord;
  const series = Array.isArray(stripped.series) ? stripped.series : [];
  if (series.length > ECHARTS_LIMITS.maxSeries) {
    throw new EChartsLimitError(`ECharts option has ${series.length} series`);
  }
  const points = countDataPoints(stripped);
  if (points > ECHARTS_LIMITS.maxDataPoints) {
    throw new EChartsLimitError(`ECharts option has ${points} data points`);
  }
  return stripped;
}

/** Full hardening applied before `chart.setOption`. Non-object values pass through sanitized. */
export function hardenEChartsOption(raw: unknown): unknown {
  const sanitized = sanitizeEChartsOption(raw);
  if (!isPlainRecord(sanitized)) return sanitized;
  return forceRichTextTooltips(restrictEChartsOption(sanitized));
}

/**
 * Parses a fence body with `JSON.parse` (never `eval`) and hardens it.
 * @throws when the body is too long, not a JSON object, or over {@link ECHARTS_LIMITS}
 */
export function parseEChartsSource(code: string): Record<string, unknown> {
  if (code.length > ECHARTS_LIMITS.maxSourceLength) {
    throw new EChartsLimitError(`ECharts source is ${code.length} characters`);
  }
  const option = hardenEChartsOption(JSON.parse(code));
  // `null`, an array or a number is valid JSON but not an option: show the source instead of a chart.
  if (!isPlainRecord(option)) throw new TypeError('An ECharts option must be a JSON object');
  return option;
}
