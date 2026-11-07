/**
 * Self-contained HTML documents for the blocks React Native cannot draw natively: display math,
 * Mermaid and ECharts. Each one reports its height to the app via `ReactNativeWebView.postMessage`.
 *
 * Content is passed as JSON in a `<script type="application/json">` (never as markup), scripts load
 * from a pinned CDN URL with Subresource Integrity, and a CSP allows nothing else.
 */
import katex from 'katex';

import { applyChartTextTheme } from '../core/echarts-theme.ts';
import { parseEChartsSource } from '../core/echarts-security.ts';
import { KATEX_SECURITY_OPTIONS, MERMAID_CONFIG, stripMermaidSourceOverrides } from '../core/security.ts';
import type { NativeTheme } from './theme.ts';

/** A script loaded into a block's WebView. `integrity` is checked by the WebView (SRI). */
export interface ScriptSource {
  url: string;
  integrity?: string;
}

export const MERMAID_SCRIPT: ScriptSource = {
  url: 'https://cdn.jsdelivr.net/npm/mermaid@11.17.2/dist/mermaid.min.js',
  integrity: 'sha384-EOXBFmc3gx5mb+vn0vPvvGqACToJD24hhacX5Yx+8NUUQrHIle/Qi5Bg9o3zKwW2',
};

export const ECHARTS_SCRIPT: ScriptSource = {
  url: 'https://cdn.jsdelivr.net/npm/echarts@6.1.0/dist/echarts.min.js',
  integrity: 'sha384-C2iskrW/uPW46KzOjrvJIQo4YkV8lkD+QS0CrDN18IIPIpT/g2USu8bTP3nvmIAD',
};

/** JSON safe to embed in a `<script>` element. */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** `#rgb` / `#rrggbb` → `rgb(r, g, b)` (the chart theme derives faint grid lines from it). */
export function toRgb(color: string): string {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color)?.[1];
  if (!hex) return color;
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  const n = Number.parseInt(full, 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

const escapeAttr = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** `https://host:port` of a script URL (React Native's URL has no `origin`). */
function originOf(url: string): string {
  return /^https:\/\/[^/?#\s'";]+/i.exec(url)?.[0] ?? "'none'";
}

const REPORT_HEIGHT = `function rlmReport(){var h=Math.ceil(document.documentElement.getBoundingClientRect().height);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({height:h}))}
window.addEventListener('load',rlmReport);if(window.ResizeObserver)new ResizeObserver(rlmReport).observe(document.documentElement);`;

/** Whether a theme's background is dark (relative luminance of `#rrggbb` / `#rgb`; anything else counts as light). */
export function isDarkTheme(theme: NativeTheme): boolean {
  const match = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(toRgb(theme.background));
  if (!match) return false;
  const [r, g, b] = match.slice(1).map(Number) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}

function page(theme: NativeTheme, body: string, script?: ScriptSource, extraStyle = ''): string {
  const scriptSrc = script ? originOf(script.url) : "'none'";
  // Without a matching color-scheme, a WebView (or iframe) on a dark screen paints an opaque white canvas.
  const scheme = isDarkTheme(theme) ? 'dark' : 'light';
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<meta name="color-scheme" content="${scheme}">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${scriptSrc} 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:">
<style>:root{color-scheme:${scheme}}html,body{margin:0;padding:0;background:transparent;color:${theme.foreground};font-family:-apple-system,system-ui,sans-serif}${extraStyle}</style>
</head><body>${body}
<script>${REPORT_HEIGHT}</script>
${script ? `<script src="${escapeAttr(script.url)}"${script.integrity ? ` integrity="${escapeAttr(script.integrity)}" crossorigin="anonymous"` : ''}></script>` : ''}
</body></html>`;
}

/** Display math, rendered here with KaTeX to MathML (no fonts or CSS needed in the WebView). */
export function mathHtml(tex: string, theme: NativeTheme): string {
  const markup = katex.renderToString(tex, {
    ...KATEX_SECURITY_OPTIONS,
    displayMode: true,
    output: 'mathml',
    throwOnError: false,
  });
  return page(theme, `<div class="m">${markup}</div>`, undefined, `.m{padding:4px 0;font-size:${theme.fontSize + 2}px;overflow-x:auto}math{display:block}`);
}

export function mermaidHtml(source: string, theme: NativeTheme, dark: boolean, script: ScriptSource = MERMAID_SCRIPT): string {
  const config = { ...MERMAID_CONFIG, theme: dark ? 'dark' : 'default' };
  // On any failure the diagram source is shown as text.
  const run = `function(){var d=JSON.parse(document.getElementById('d').textContent),o=document.getElementById('o');
function fail(){o.textContent=d.source;rlmReport()}
try{mermaid.initialize(d.config);mermaid.render('rlm-m',d.source).then(function(r){o.innerHTML=r.svg;rlmReport()},fail)}catch(e){fail()}}`;
  return page(
    theme,
    `<div id="o"></div><script type="application/json" id="d">${jsonForScript({ source: stripMermaidSourceOverrides(source), config })}</script>`,
    script,
    `#o{display:flex;justify-content:center;padding:8px;white-space:pre-wrap;font-family:${theme.monoFontFamily ?? 'monospace'}}#o svg{max-width:100%;height:auto;font-family:-apple-system,system-ui,sans-serif}`,
  ).replace('</body>', `<script>window.addEventListener('load',${run})</script></body>`);
}

/**
 * ECharts: the fence is parsed and hardened here (JSON only, allowlists, limits) before it reaches
 * the WebView. Throws when the fence is invalid; the caller then shows the source.
 */
export function echartsHtml(code: string, theme: NativeTheme, script: ScriptSource = ECHARTS_SCRIPT): string {
  const option = applyChartTextTheme(parseEChartsSource(code), toRgb(theme.foreground));
  const run = `function(){var o=JSON.parse(document.getElementById('d').textContent);var c=echarts.init(document.getElementById('c'),null,{renderer:'canvas'});c.setOption(o);window.addEventListener('resize',function(){c.resize()});rlmReport()}`;
  return page(
    theme,
    `<div id="c"></div><script type="application/json" id="d">${jsonForScript(option)}</script>`,
    script,
    `#c{width:100%;height:${theme.chartHeight}px}`,
  ).replace('</body>', `<script>window.addEventListener('load',${run})</script></body>`);
}
