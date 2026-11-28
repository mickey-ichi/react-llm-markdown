import { describe, it } from 'node:test';

import { neededFeatureKey } from '../dist/web/plugins.js';
import { expect } from './expect.ts';

describe('neededFeatureKey: only the rich blocks the text uses are loaded', () => {
  it('plain text needs nothing', () => {
    expect(neededFeatureKey('Hello **world**, the price is $5 and `inline code`.')).toBe('');
  });
  it('detects fences, math, diagrams, charts and CJK', () => {
    expect(neededFeatureKey('```ts\nconst a = 1\n```')).toBe('code');
    expect(neededFeatureKey('> - ```mermaid\n  graph TD; A-->B')).toBe('code,mermaid');
    expect(neededFeatureKey('~~~chart\n{}\n~~~')).toBe('code,echarts');
    expect(neededFeatureKey('Euler: $$e^{i\\pi}+1=0$$')).toBe('math');
    expect(neededFeatureKey('inline \\(x^2\\)')).toBe('math');
    expect(neededFeatureKey('**強調**です')).toBe('cjk');
  });
  it('a feature turned off is never needed', () => {
    expect(neededFeatureKey('```mermaid\ngraph\n```', { mermaid: false })).toBe('code');
  });
  it('grows while a stream adds blocks', () => {
    const partial = 'Here is a diagram:\n\n```mer';
    expect(neededFeatureKey(partial)).toBe('code');
    expect(neededFeatureKey(`${partial}maid\ngraph`)).toBe('code,mermaid');
  });
});
