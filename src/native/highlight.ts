import type { LanguageRegistration } from '@shikijs/types';
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript';
import langCss from '@shikijs/langs/css';
import langDiff from '@shikijs/langs/diff';
import langHtml from '@shikijs/langs/html';
import langJson from '@shikijs/langs/json';
import langPython from '@shikijs/langs/python';
import langShell from '@shikijs/langs/shellscript';
import langSql from '@shikijs/langs/sql';
import langTsx from '@shikijs/langs/tsx';
import langYaml from '@shikijs/langs/yaml';
import githubDark from '@shikijs/themes/github-dark';
import githubLight from '@shikijs/themes/github-light';
import { createHighlighterCoreSync, type HighlighterCore } from 'shiki/core';

import type { ColorScheme } from './theme.ts';

/** One highlighted line: colored pieces of text. */
export type CodeLine = { content: string; color?: string }[];

/** Turns code into colored lines, or null to show it uncolored. */
export type CodeHighlighter = (code: string, language: string, scheme: ColorScheme) => CodeLine[] | null;

/**
 * Grammars bundled by default (React Native bundles everything up front, so the set is small).
 * TSX also covers JavaScript, TypeScript and JSX.
 */
export const DEFAULT_LANGUAGES: LanguageRegistration[][] = [
  langTsx,
  langJson,
  langShell,
  langPython,
  langHtml,
  langCss,
  langSql,
  langYaml,
  langDiff,
];

const ALIASES: Record<string, string> = {
  js: 'tsx',
  javascript: 'tsx',
  jsx: 'tsx',
  ts: 'tsx',
  typescript: 'tsx',
  mjs: 'tsx',
  cjs: 'tsx',
  sh: 'shellscript',
  bash: 'shellscript',
  shell: 'shellscript',
  zsh: 'shellscript',
  py: 'python',
  yml: 'yaml',
};

/**
 * A synchronous Shiki highlighter on the JavaScript regex engine (no WebAssembly, so it runs on
 * Hermes and in Expo Go). Pass more grammars from `@shikijs/langs/*` to support other languages.
 */
export function createCodeHighlighter(languages: LanguageRegistration[][] = DEFAULT_LANGUAGES): CodeHighlighter {
  let highlighter: HighlighterCore | null | undefined;
  const loaded = new Set<string>();
  // Streaming re-renders every block on every chunk; finished blocks come from here instead of Shiki.
  const cache = new Map<string, CodeLine[] | null>();
  const remember = (key: string, lines: CodeLine[] | null) => {
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
    cache.set(key, lines);
    return lines;
  };
  return (code, language, scheme) => {
    const key = `${scheme}\u0000${language}\u0000${code}`;
    if (cache.has(key)) return cache.get(key)!;
    if (highlighter === undefined) {
      try {
        highlighter = createHighlighterCoreSync({
          themes: [githubLight, githubDark],
          langs: languages,
          engine: createJavaScriptRegexEngine({ target: 'ES2018', forgiving: true }),
        });
        for (const id of highlighter.getLoadedLanguages()) loaded.add(id);
      } catch {
        highlighter = null;
      }
    }
    const lang = ALIASES[language.toLowerCase()] ?? language.toLowerCase();
    if (!highlighter || !loaded.has(lang)) return remember(key, null);
    try {
      const { tokens } = highlighter.codeToTokens(code, {
        lang,
        theme: scheme === 'dark' ? 'github-dark' : 'github-light',
      });
      return remember(key, tokens.map((line) => line.map((token) => ({ content: token.content, color: token.color }))));
    } catch {
      return remember(key, null);
    }
  };
}
