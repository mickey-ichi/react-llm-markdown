'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CodeBlockCopyButton, type CustomRendererProps } from 'streamdown';

import { parseEChartsSource } from '../core/echarts-security.ts';
import { applyChartTextTheme, applyLargeDataDefaults } from '../core/echarts-theme.ts';

/** Re-read the text color once a light/dark color transition has settled. */
const THEME_RECHECK_DELAY_MS = 350;

interface EChartsInstance {
  setOption: (option: unknown, opts?: { notMerge?: boolean }) => void;
  resize: () => void;
  dispose: () => void;
}

/**
 * Renderer for ```echarts / ```chart fences whose body is a JSON ECharts `option`.
 *
 * The body is parsed with `JSON.parse` only, so function-valued fields (formatters) are not
 * supported by design. Malformed JSON, an option over the limits, or a failed load of `echarts`
 * falls back to showing the source. The chart follows the container's text color and re-themes
 * when `class` / `data-theme` / `style` on `<html>` changes.
 */
export function EChartsBlock({ code, isIncomplete }: CustomRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [runtimeFailedCode, setRuntimeFailedCode] = useState<string | null>(null);
  const parsed = useMemo(() => {
    try {
      return { failed: false, option: applyLargeDataDefaults(parseEChartsSource(code)) } as const;
    } catch {
      return { failed: true, option: null } as const;
    }
  }, [code]);
  const failed = parsed.failed || runtimeFailedCode === code;

  useEffect(() => {
    if (isIncomplete || parsed.failed || !containerRef.current) return;

    let disposed = false;
    let chart: EChartsInstance | null = null;
    let themeObserver: MutationObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let recheckTimer: number | undefined;

    void import('echarts')
      .then((echarts) => {
        const container = containerRef.current;
        if (disposed || !container) return;
        const instance: EChartsInstance = echarts.init(container);
        chart = instance;
        let themeColor = getComputedStyle(container).color;
        instance.setOption(applyChartTextTheme(parsed.option, themeColor));

        const reapplyTheme = () => {
          if (disposed) return;
          const next = getComputedStyle(container).color;
          if (next === themeColor) return;
          themeColor = next;
          instance.setOption(applyChartTextTheme(parsed.option, themeColor), { notMerge: true });
        };
        themeObserver = new MutationObserver(() => {
          reapplyTheme();
          window.clearTimeout(recheckTimer);
          recheckTimer = window.setTimeout(reapplyTheme, THEME_RECHECK_DELAY_MS);
        });
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class', 'data-theme', 'style'],
        });
        resizeObserver = new ResizeObserver(() => instance.resize());
        resizeObserver.observe(container);
      })
      .catch(() => setRuntimeFailedCode(code));

    return () => {
      disposed = true;
      themeObserver?.disconnect();
      resizeObserver?.disconnect();
      window.clearTimeout(recheckTimer);
      chart?.dispose();
    };
  }, [code, isIncomplete, parsed]);

  // The same header (label + copy source) for the chart and for its source fallback.
  return (
    <div data-rlm-block="echarts">
      <div data-rlm-block-header="echarts">
        <span>ECharts</span>
        <CodeBlockCopyButton code={code} />
      </div>
      {isIncomplete || failed ? (
        <pre data-rlm-block-body="echarts-source">
          <code>{code}</code>
        </pre>
      ) : (
        <div ref={containerRef} data-rlm-block-body="echarts" />
      )}
    </div>
  );
}
