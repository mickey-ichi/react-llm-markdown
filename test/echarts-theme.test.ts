import { describe, it } from 'node:test';

import { applyChartTextTheme, applyLargeDataDefaults } from '../dist/web/index.js';
import { expect } from './expect.ts';

/**
 * ECharts draws outside the CSS cascade, so its default mid-gray text is unreadable on a dark
 * background. applyChartTextTheme fills in the container's text color wherever the option did not
 * set one.
 */
describe('applyChartTextTheme', () => {
  const WHITE = 'rgb(255, 255, 255)';

  it('sets default textStyle color', () => {
    const themed = applyChartTextTheme({ series: [] }, WHITE) as { textStyle: { color: string } };
    expect(themed.textStyle.color).toBe(WHITE);
  });

  it('sets axisLabel and nameTextStyle color on a single xAxis/yAxis', () => {
    const themed = applyChartTextTheme(
      { xAxis: { type: 'category' }, yAxis: { type: 'value' } },
      WHITE,
    ) as {
      xAxis: { axisLabel: { color: string }; nameTextStyle: { color: string } };
      yAxis: { axisLabel: { color: string }; nameTextStyle: { color: string } };
    };
    expect(themed.xAxis.axisLabel.color).toBe(WHITE);
    expect(themed.xAxis.nameTextStyle.color).toBe(WHITE);
    expect(themed.yAxis.axisLabel.color).toBe(WHITE);
    expect(themed.yAxis.nameTextStyle.color).toBe(WHITE);
  });

  it('sets axisLine and axisTick line color (the baseline at 0)', () => {
    const themed = applyChartTextTheme({ xAxis: { type: 'category' } }, WHITE) as {
      xAxis: { axisLine: { lineStyle: { color: string } }; axisTick: { lineStyle: { color: string } } };
    };
    expect(themed.xAxis.axisLine.lineStyle.color).toBe(WHITE);
    expect(themed.xAxis.axisTick.lineStyle.color).toBe(WHITE);
  });

  it('does NOT override an agent-set axisLine color', () => {
    const themed = applyChartTextTheme(
      { yAxis: { axisLine: { lineStyle: { color: '#123456' } } } },
      WHITE,
    ) as { yAxis: { axisLine: { lineStyle: { color: string } } } };
    expect(themed.yAxis.axisLine.lineStyle.color).toBe('#123456');
  });

  it('dims split/grid lines to a faint variant of the theme color', () => {
    const themed = applyChartTextTheme({ yAxis: { type: 'value' } }, WHITE) as {
      yAxis: { splitLine: { lineStyle: { color: string } } };
    };
    // Baseline stays full white; grid lines dimmed with low alpha.
    expect(themed.yAxis.splitLine.lineStyle.color).toBe('rgba(255, 255, 255, 0.15)');
  });

  it('does NOT override an agent-set splitLine color', () => {
    const themed = applyChartTextTheme(
      { yAxis: { splitLine: { lineStyle: { color: '#abcdef' } } } },
      WHITE,
    ) as { yAxis: { splitLine: { lineStyle: { color: string } } } };
    expect(themed.yAxis.splitLine.lineStyle.color).toBe('#abcdef');
  });

  it('leaves split lines untouched when the theme color is not parseable', () => {
    const themed = applyChartTextTheme({ yAxis: { type: 'value' } }, 'not-a-color') as {
      yAxis: Record<string, unknown>;
    };
    expect(themed.yAxis.splitLine).toBeUndefined();
  });

  it('handles array-valued axes (dual axis)', () => {
    const themed = applyChartTextTheme(
      { yAxis: [{ type: 'value' }, { type: 'value' }] },
      WHITE,
    ) as { yAxis: Array<{ axisLabel: { color: string } }> };
    expect(themed.yAxis[0]?.axisLabel.color).toBe(WHITE);
    expect(themed.yAxis[1]?.axisLabel.color).toBe(WHITE);
  });

  it('does NOT override a color the agent explicitly set', () => {
    const themed = applyChartTextTheme(
      { xAxis: { axisLabel: { color: '#ff0000' } }, textStyle: { color: '#00ff00' } },
      WHITE,
    ) as { xAxis: { axisLabel: { color: string } }; textStyle: { color: string } };
    expect(themed.xAxis.axisLabel.color).toBe('#ff0000');
    expect(themed.textStyle.color).toBe('#00ff00');
  });

  it('preserves other axis properties while adding color', () => {
    const themed = applyChartTextTheme(
      { xAxis: { type: 'category', data: ['Mon', 'Tue'], axisLabel: { rotate: 45 } } },
      WHITE,
    ) as {
      xAxis: { type: string; data: string[]; axisLabel: { rotate: number; color: string } };
    };
    expect(themed.xAxis.type).toBe('category');
    expect(themed.xAxis.data).toEqual(['Mon', 'Tue']);
    expect(themed.xAxis.axisLabel.rotate).toBe(45);
    expect(themed.xAxis.axisLabel.color).toBe(WHITE);
  });

  it('leaves an axis absent when the option omits it', () => {
    const themed = applyChartTextTheme({ series: [] }, WHITE) as Record<string, unknown>;
    expect(themed.xAxis).toBeUndefined();
    expect(themed.yAxis).toBeUndefined();
  });

  it('colors the title and subtitle, which ignore the global textStyle', () => {
    const themed = applyChartTextTheme({ title: { text: 'Sales', subtext: '2026' } }, WHITE) as {
      title: { text: string; textStyle: { color: string }; subtextStyle: { color: string } };
    };
    expect(themed.title.text).toBe('Sales');
    expect(themed.title.textStyle.color).toBe(WHITE);
    expect(themed.title.subtextStyle.color).toBe(WHITE);
  });

  it('colors every title in an array and the legend text', () => {
    const themed = applyChartTextTheme(
      { title: [{ text: 'A' }, { text: 'B' }], legend: { data: ['x'] } },
      WHITE,
    ) as {
      title: Array<{ textStyle: { color: string } }>;
      legend: { textStyle: { color: string } };
    };
    expect(themed.title[0]?.textStyle.color).toBe(WHITE);
    expect(themed.title[1]?.textStyle.color).toBe(WHITE);
    expect(themed.legend.textStyle.color).toBe(WHITE);
  });

  it('keeps a title color the agent explicitly set', () => {
    const themed = applyChartTextTheme(
      { title: { text: 'A', textStyle: { color: '#ff0000', fontSize: 20 } } },
      WHITE,
    ) as { title: { textStyle: { color: string; fontSize: number } } };
    expect(themed.title.textStyle.color).toBe('#ff0000');
    expect(themed.title.textStyle.fontSize).toBe(20);
  });

  it('returns non-object options unchanged', () => {
    expect(applyChartTextTheme(null, WHITE)).toBeNull();
    expect(applyChartTextTheme('string', WHITE)).toBe('string');
  });
});

describe('applyLargeDataDefaults', () => {
  const points = (n: number) => Array.from({ length: n }, (_, i) => [i, i % 5]);

  it('samples big line series, hides symbols and turns animation off', () => {
    const out = applyLargeDataDefaults({ series: [{ type: 'line', data: points(5_000) }, { type: 'bar', data: [1, 2] }] }) as {
      animation: boolean;
      series: Record<string, unknown>[];
    };
    expect(out.animation).toBe(false);
    expect(out.series[0]!.sampling).toBe('lttb');
    expect(out.series[0]!.showSymbol).toBe(false);
    expect(out.series[1]!.sampling).toBeUndefined();
  });

  it('keeps what the option set, and leaves small charts alone', () => {
    const custom = applyLargeDataDefaults({ animation: true, series: [{ type: 'line', sampling: 'average', data: points(3_000) }] }) as {
      animation: boolean;
      series: Record<string, unknown>[];
    };
    expect(custom.animation).toBe(true);
    expect(custom.series[0]!.sampling).toBe('average');
    const small = { series: [{ type: 'line', data: points(10) }] };
    expect(applyLargeDataDefaults(small)).toBe(small);
  });
});
