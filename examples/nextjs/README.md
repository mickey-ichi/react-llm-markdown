# Next.js example

A chat page in the Next.js App Router. A route handler streams an answer, and the page renders it with
`MarkdownView` as it arrives: code, a table, math, a Mermaid diagram and an ECharts chart.

```bash
cd examples/nextjs
npm install
npm run dev
```

Open http://localhost:3000 and press **Ask**.

| File | |
|---|---|
| [`app/layout.tsx`](app/layout.tsx) | Imports `react-llm-markdown/styles.css` once |
| [`app/chat.tsx`](app/chat.tsx) | Client component: reads the response stream, renders each turn with `<MarkdownView streaming>` |
| [`app/api/chat/route.ts`](app/api/chat/route.ts) | Streams a canned answer. Return your model's text stream here instead |

The page needs no API key. To use a real model, return its text stream from `route.ts`; nothing else changes.
