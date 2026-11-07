import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { MarkdownView } from '../web/markdown-view.tsx';

interface Doc {
  name: string;
  content: string;
}

const THEME_KEY = 'rlm-theme';

function initialDark(): boolean {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === 'dark';
  } catch {
    // storage blocked: fall back to the system setting
  }
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

function docUrl(): string {
  return `/__rlm/doc?path=${encodeURIComponent(location.pathname)}`;
}

function App() {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dark, setDark] = useState(initialDark);

  const load = useCallback(async () => {
    try {
      const response = await fetch(docUrl(), { cache: 'no-store' });
      if (!response.ok) throw new Error(await response.text());
      const next = (await response.json()) as Doc;
      setDoc(next);
      setError(null);
      document.title = next.name;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void load();
    const events = new EventSource(`/__rlm/events?path=${encodeURIComponent(location.pathname)}`);
    events.addEventListener('change', () => void load());
    return () => events.close();
  }, [load]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [dark]);

  return (
    <>
      <header className="viewer-bar">
        <span className="viewer-name">{doc?.name ?? ''}</span>
        <button
          aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="viewer-theme"
          onClick={() => setDark((value) => !value)}
          type="button"
        >
          {dark ? '☀' : '☾'}
        </button>
      </header>
      <main className="viewer-page">
        {error ? <p className="viewer-error">{error}</p> : null}
        {doc ? <MarkdownView codeBlockMaxHeight={0} softBreaks={false} tableMaxHeight={0}>{doc.content}</MarkdownView> : null}
      </main>
    </>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
