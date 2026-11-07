// A small `expect` over node:assert, covering the matchers these tests use.
import assert from 'node:assert/strict';

function matchers(actual: unknown, negate: boolean) {
  const check = (pass: boolean, message: string) => {
    if (pass === negate) assert.fail(`${negate ? 'not ' : ''}${message}`);
  };
  const show = (value: unknown) => (typeof value === 'string' ? JSON.stringify(value.slice(0, 400)) : String(value));
  return {
    toBe: (expected: unknown) => check(Object.is(actual, expected), `expected ${show(actual)} to be ${show(expected)}`),
    toEqual: (expected: unknown) => {
      let equal = true;
      try {
        assert.deepStrictEqual(actual, expected);
      } catch {
        equal = false;
      }
      check(equal, `expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
    },
    toContain: (expected: unknown) =>
      check((actual as string | unknown[]).includes(expected as never), `expected ${show(actual)} to contain ${show(expected)}`),
    toMatch: (pattern: RegExp | string) =>
      check(
        typeof pattern === 'string' ? String(actual).includes(pattern) : pattern.test(String(actual)),
        `expected ${show(actual)} to match ${pattern}`,
      ),
    toBeNull: () => check(actual === null, `expected ${show(actual)} to be null`),
    toBeUndefined: () => check(actual === undefined, `expected ${show(actual)} to be undefined`),
    toHaveLength: (length: number) =>
      check((actual as { length: number }).length === length, `expected length ${length}`),
    toThrow: (expected?: (new (...args: never[]) => Error) | RegExp | string) => {
      let error: unknown;
      try {
        (actual as () => unknown)();
      } catch (err) {
        error = err;
      }
      let pass = error !== undefined;
      if (pass && typeof expected === 'function') pass = error instanceof expected;
      else if (pass && expected instanceof RegExp) pass = expected.test(String((error as Error).message));
      else if (pass && typeof expected === 'string') pass = String((error as Error).message).includes(expected);
      check(pass, `expected function to throw${expected ? ` ${String(expected)}` : ''}`);
    },
  };
}

export function expect(actual: unknown) {
  return { ...matchers(actual, false), not: matchers(actual, true) };
}
