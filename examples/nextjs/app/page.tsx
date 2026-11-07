import { Chat } from './chat';

export default function Page() {
  return (
    <main>
      <h1>react-llm-markdown + Next.js</h1>
      <p className="hint">
        A route handler streams an answer; the page renders it with <code>MarkdownView</code> as it arrives.
      </p>
      <Chat />
    </main>
  );
}
