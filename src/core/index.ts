// DOM-free core shared by the web and React Native renderers.
export { parseMarkdown, prepareMarkdown, stripDanglingMarker, type ParseOptions, type PrepareOptions } from './parse.ts';
export {
  ALLOWED_HTML_TAGS,
  ALLOWED_URL_PROTOCOLS,
  KATEX_SECURITY_OPTIONS,
  MERMAID_CONFIG,
  sanitizeMarkdownUrl,
  stripMermaidConfigOverrides,
  stripMermaidSourceOverrides,
  stripProtocolRelativeMarkdownLinks,
} from './security.ts';
export {
  ECHARTS_ALLOWED_OPTION_KEYS,
  ECHARTS_ALLOWED_SERIES_TYPES,
  ECHARTS_LIMITS,
  EChartsLimitError,
  hardenEChartsOption,
  parseEChartsSource,
  restrictEChartsOption,
  sanitizeEChartsOption,
} from './echarts-security.ts';
export { applyChartTextTheme, applyLargeDataDefaults, LARGE_SERIES_THRESHOLD } from './echarts-theme.ts';
export { normalizeLatexDelimiters } from './latex.ts';
export { remarkSoftBreaks } from './soft-breaks.ts';
