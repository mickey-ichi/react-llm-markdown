import type { Metadata } from 'next';
import type { ReactNode } from 'react';
// The renderer's prebuilt styles: import them once, at the root.
import 'react-llm-markdown/styles.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'react-llm-markdown · Next.js example',
};

// MarkdownView's dark theme follows `data-theme="dark"` (or a `dark` class) on <html>. This sets it from the system
// setting before the first paint and keeps it in sync; an app with its own theme switch sets it there instead.
const THEME_SCRIPT = `(() => {
  const query = matchMedia('(prefers-color-scheme: dark)');
  const apply = () => document.documentElement.dataset.theme = query.matches ? 'dark' : 'light';
  apply();
  query.addEventListener('change', apply);
})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
