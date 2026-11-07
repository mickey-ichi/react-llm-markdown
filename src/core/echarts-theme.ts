import { isPlainRecord } from './echarts-security.ts';

type UnknownRecord = Record<string, unknown>;

/** Alpha for split (grid) lines, so they read as a faint guide behind the data. */
const SPLIT_LINE_ALPHA = 0.15;

/** `rgb(...)` / `rgba(...)` → the same color at `alpha`; null for any other format. */
function toFaintColor(color: string, alpha: number): string | null {
  const match = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!match) return null;
  return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
}

/** Defaults `lineStyle.color`, keeping an explicit lineStyle; `show` is left untouched. */
function withLineColor(node: unknown, color: string): UnknownRecord {
  const base = isPlainRecord(node) ? node : {};
  const lineStyle = isPlainRecord(base.lineStyle) ? base.lineStyle : {};
  return { ...base, lineStyle: { color, ...lineStyle } };
}

function withAxisTheme(axis: unknown, color: string): unknown {
  if (!isPlainRecord(axis)) return axis;
  const axisLabel = isPlainRecord(axis.axisLabel) ? axis.axisLabel : {};
  const nameTextStyle = isPlainRecord(axis.nameTextStyle) ? axis.nameTextStyle : {};
  const faint = toFaintColor(color, SPLIT_LINE_ALPHA);
  return {
    ...axis,
    axisLabel: { color, ...axisLabel },
    nameTextStyle: { color, ...nameTextStyle },
    axisLine: withLineColor(axis.axisLine, color),
    axisTick: withLineColor(axis.axisTick, color),
    ...(faint ? { splitLine: withLineColor(axis.splitLine, faint) } : {}),
  };
}

function withTextColor(component: unknown, color: string, styleKeys: readonly string[]): unknown {
  if (!isPlainRecord(component)) return component;
  const themed: UnknownRecord = { ...component };
  for (const key of styleKeys) {
    const style = isPlainRecord(themed[key]) ? themed[key] : {};
    themed[key] = { color, ...style };
  }
  return themed;
}

/** Components that use their own dark default text color instead of the global `textStyle`. */
const TEXT_COMPONENTS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['title', ['textStyle', 'subtextStyle']],
  ['legend', ['textStyle']],
];

/**
 * Fills theme-aware default colors into an ECharts option: global, title and legend text, each
 * axis's labels, line and ticks (full color) and its split lines (faint). ECharts draws on a
 * canvas outside the CSS cascade, so its mid-gray defaults are unreadable on a dark background.
 * `color` is the container's computed text color. Colors the option sets itself always win.
 */
export function applyChartTextTheme(option: unknown, color: string): unknown {
  if (!isPlainRecord(option)) return option;
  const themed: UnknownRecord = { ...option };
  const textStyle = isPlainRecord(themed.textStyle) ? themed.textStyle : {};
  themed.textStyle = { color, ...textStyle };
  for (const [key, styleKeys] of TEXT_COMPONENTS) {
    const component = themed[key];
    if (component === undefined) continue;
    themed[key] = Array.isArray(component)
      ? component.map((entry) => withTextColor(entry, color, styleKeys))
      : withTextColor(component, color, styleKeys);
  }
  for (const axisKey of ['xAxis', 'yAxis'] as const) {
    const axis = themed[axisKey];
    if (axis === undefined) continue;
    themed[axisKey] = Array.isArray(axis)
      ? axis.map((entry) => withAxisTheme(entry, color))
      : withAxisTheme(axis, color);
  }
  return themed;
}
