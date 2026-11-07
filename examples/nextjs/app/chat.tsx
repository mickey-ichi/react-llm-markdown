'use client';

import { useRef, useState, type FormEvent } from 'react';
import { MarkdownView } from 'react-llm-markdown';

/** One question and its answer. `done` is false while the answer is still streaming in. */
type Turn = { question: string; answer: string; done: boolean };

export function Chat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('Show me what you can render.');
  const busy = turns.at(-1)?.done === false;
  const abort = useRef<AbortController | null>(null);

  async function ask(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    setInput('');
    setTurns((all) => [...all, { question, answer: '', done: false }]);
    const update = (change: Partial<Turn>) =>
      setTurns((all) => all.map((turn, index) => (index === all.length - 1 ? { ...turn, ...change } : turn)));

    abort.current = new AbortController();
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question }),
        signal: abort.current.signal,
      });
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

      // Append each chunk as it arrives; MarkdownView repairs the half-written Markdown.
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let answer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        answer += value;
        update({ answer });
      }
      update({ done: true });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') update({ answer: `**Error:** ${(error as Error).message}` });
      update({ done: true });
    }
  }

  return (
    <>
      {turns.map((turn, index) => (
        <section key={index}>
          <p className="question">{turn.question}</p>
          <MarkdownView streaming={!turn.done}>{turn.answer}</MarkdownView>
        </section>
      ))}
      <form onSubmit={ask}>
        <input aria-label="Question" onChange={(event) => setInput(event.target.value)} value={input} />
        {busy ? (
          <button onClick={() => abort.current?.abort()} type="button">
            Stop
          </button>
        ) : (
          <button disabled={!input.trim()} type="submit">
            Ask
          </button>
        )}
      </form>
    </>
  );
}
