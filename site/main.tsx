import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ScrollView } from 'react-native';

import { MarkdownView as NativeMarkdownView } from '../src/native/index.ts';
import { MarkdownView } from '../src/web/index.ts';
import { IframeWebView } from './iframe-webview.tsx';
import { PRESETS } from './presets.ts';

const REPO = 'https://github.com/mickey-ichi/react-llm-markdown';
const SPEEDS = { slow: 2, normal: 6, fast: 18 } as const;

const code = (lang: string, body: string) => `\`\`\`${lang}\n${body}\n\`\`\``;
const INSTALL = [
  {
    title: 'Web',
    markdown: [
      code('bash', 'npm install react-llm-markdown \\\n  streamdown @streamdown/code @streamdown/math \\\n  @streamdown/mermaid @streamdown/cjk echarts'),
      code('tsx', "import { MarkdownView } from 'react-llm-markdown';\nimport 'react-llm-markdown/styles.css';\n\n<MarkdownView streaming={!done}>\n  {text}\n</MarkdownView>"),
    ].join('\n\n'),
  },
  {
    title: 'React Native and Expo',
    markdown: [
      code('bash', 'npm install react-llm-markdown\nnpx expo install react-native-webview'),
      code('tsx', "import { WebView } from 'react-native-webview';\nimport { MarkdownView } from 'react-llm-markdown/native';\n\n<MarkdownView\n  streaming={!done}\n  webView={WebView}\n>\n  {text}\n</MarkdownView>"),
    ].join('\n\n'),
  },
  {
    title: 'Any .md file',
    markdown: [code('bash', 'npx react-llm-markdown README.md'), 'Opens it in your browser and reloads on every save.'].join('\n\n'),
  },
];
type Speed = keyof typeof SPEEDS;
type Pane = 'source' | 'web' | 'phone';

// ---------- share links: #md=<base64url of the UTF-8 text> ----------

function encode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decode(value: string): string | null {
  try {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
    return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
}

function initialText(): { text: string; preset: string | null } {
  const shared = new URLSearchParams(location.hash.slice(1)).get('md');
  const decoded = shared ? decode(shared) : null;
  if (decoded !== null) return { text: decoded, preset: null };
  return { text: PRESETS[0]!.markdown, preset: PRESETS[0]!.id };
}

/** True on screens where the panes are shown one at a time (same breakpoint as site.css). */
function useNarrow(): boolean {
  const query = '(max-width: 1100px)';
  const [narrow, setNarrow] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const list = matchMedia(query);
    const update = () => setNarrow(list.matches);
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, []);
  return narrow;
}

function initialDark(): boolean {
  try {
    const saved = localStorage.getItem('rlm-site-theme');
    if (saved) return saved === 'dark';
  } catch {
    // storage blocked
  }
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

// ---------- app ----------

function App() {
  const start = useMemo(initialText, []);
  const [text, setText] = useState(start.text);
  const [preset, setPreset] = useState<string | null>(start.preset);
  const [shown, setShown] = useState<number | null>(null); // characters revealed while streaming
  const [speed, setSpeed] = useState<Speed>('normal');
  const [dark, setDark] = useState(initialDark);
  const [pane, setPane] = useState<Pane>('web');
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const narrow = useNarrow();

  const streaming = shown !== null && shown < text.length;
  const visible = shown === null ? text : text.slice(0, shown);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('rlm-site-theme', dark ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [dark]);

  // Reveal the text a few characters at a time, like a model streaming its answer.
  useEffect(() => {
    if (shown === null) return;
    if (shown >= text.length) {
      setShown(null);
      return;
    }
    timer.current = window.setTimeout(() => setShown((n) => (n === null ? null : n + SPEEDS[speed])), 24);
    return () => window.clearTimeout(timer.current);
  }, [shown, text.length, speed]);

  const choose = (id: string) => {
    const next = PRESETS.find((p) => p.id === id);
    if (!next) return;
    setPreset(id);
    setText(next.markdown);
    setShown(0);
    history.replaceState(null, '', location.pathname);
  };

  const toggleStream = () => setShown((n) => (n === null ? 0 : null));

  const share = useCallback(async () => {
    const url = `${location.origin}${location.pathname}#md=${encode(text)}`;
    history.replaceState(null, '', url);
    try {
      await navigator.clipboard.writeText(url);
      setCopied('Link copied');
    } catch {
      setCopied('Link is in the address bar');
    }
    window.setTimeout(() => setCopied(null), 2200);
  }, [text]);

  return (
    <>
      <header className="masthead">
        <div className="brand">
          <img alt="" className="brand-icon" height={48} src="icon-192.png" width={48} />
          <h1>react-llm-markdown</h1>
        </div>
        <p className="thesis">
          Markdown from your model, rendered <mark className="swipe">safely</mark> — in the browser and on the phone.
        </p>
        <nav aria-label="Project" className="links">
          <a className="links-docs" href="docs/introduction/">
            Docs
          </a>
          <a href={REPO}>GitHub</a>
          <a href="https://www.npmjs.com/package/react-llm-markdown">npm</a>
          <a href="docs/security/">Security</a>
        </nav>
      </header>

      <section aria-label="Playground" className="playground">
        <div className="toolbar">
          <div aria-label="Examples" className="presets" role="group">
            {PRESETS.map((p) => (
              <button aria-pressed={preset === p.id} className="chip" key={p.id} onClick={() => choose(p.id)} type="button">
                {p.label}
              </button>
            ))}
          </div>
          <div className="controls">
            <button className={`stream ${streaming ? 'is-live' : ''}`} onClick={toggleStream} type="button">
              <span aria-hidden className="dot" />
              {streaming ? 'Stop streaming' : 'Stream it'}
            </button>
            <label className="speed">
              <span className="speed-label">Speed</span>
              <select onChange={(e) => setSpeed(e.target.value as Speed)} value={speed}>
                <option value="slow">Slow</option>
                <option value="normal">Normal</option>
                <option value="fast">Fast</option>
              </select>
            </label>
            <button className="ghost" onClick={share} type="button">
              {copied ?? (narrow ? 'Share' : 'Copy link')}
            </button>
            <button aria-label={dark ? 'Use light theme' : 'Use dark theme'} className="ghost square" onClick={() => setDark((d) => !d)} type="button">
              {dark ? '☀' : '☾'}
            </button>
          </div>
        </div>

        <div aria-label="Show" className="tabs" role="tablist">
          {(['source', 'web', 'phone'] as const).map((p) => (
            <button aria-selected={pane === p} key={p} onClick={() => setPane(p)} role="tab" type="button">
              {{ source: 'Markdown', web: 'Web', phone: 'React Native' }[p]}
            </button>
          ))}
        </div>

        <div className="panes" data-pane={pane}>
          <div className="pane pane-source">
            <div className="pane-label">
              Markdown <span>{streaming ? `${visible.length.toLocaleString('en')} / ${text.length.toLocaleString('en')}` : `${text.length.toLocaleString('en')} characters`}</span>
            </div>
            <textarea
              aria-label="Markdown source"
              onChange={(e) => {
                setText(e.target.value);
                setPreset(null);
                setShown(null);
              }}
              spellCheck={false}
              value={streaming ? visible : text}
            />
          </div>

          <div className="pane pane-web">
            <div className="pane-label">
              Web <code>react-llm-markdown</code>
            </div>
            <div className="browser">
              <div aria-hidden className="browser-bar">
                <i />
                <i />
                <i />
                <span>your-chat-app.example</span>
              </div>
              <div className="browser-body">
                <MarkdownView streaming={streaming}>{visible}</MarkdownView>
              </div>
            </div>
          </div>

          <div className="pane pane-phone">
            <div className="pane-label">
              React Native <code>react-llm-markdown/native</code>
            </div>
            {narrow ? (
              // Already on a phone: no device frame, the page itself is the screen.
              <div className="device-bare">
                <NativeMarkdownView colorScheme={dark ? 'dark' : 'light'} streaming={streaming} webView={IframeWebView}>
                  {visible}
                </NativeMarkdownView>
              </div>
            ) : (
              <div className="phone">
                <div aria-hidden className="phone-status">
                  <span className="phone-island" />
                </div>
                <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 8 }} showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  <NativeMarkdownView colorScheme={dark ? 'dark' : 'light'} streaming={streaming} webView={IframeWebView}>
                    {visible}
                  </NativeMarkdownView>
                </ScrollView>
              </div>
            )}
            <p className="note">Rendered by the native renderer through react-native-web. Math, diagrams and charts run in the same WebView documents a phone would load, here in a sandboxed iframe.</p>
          </div>
        </div>
      </section>

      <section aria-label="Install" className="install">
        {INSTALL.map((block) => (
          <div key={block.title}>
            <h2>{block.title}</h2>
            {/* Rendered with the library itself: Shiki highlighting and a copy button. */}
            <MarkdownView codeBlockMaxHeight={0} lineNumbers={false}>
              {block.markdown}
            </MarkdownView>
          </div>
        ))}
      </section>

      <footer className="footer">
        <span>MIT license</span>
        <a href="docs/performance/">Performance</a>
        <a href="docs/introduction/">Documentation</a>
        <span>Built on Streamdown, Shiki, KaTeX, Mermaid and ECharts</span>
      </footer>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
