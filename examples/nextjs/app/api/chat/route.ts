// A stand-in for your model: it streams a canned Markdown answer in small chunks, the way an LLM API does.
// To use a real model, return its text stream instead (for example the text deltas of your provider's SDK) —
// the page does not change.

const ANSWER = `Here is a short tour of what **react-llm-markdown** renders.

## Code

\`\`\`ts
export async function* stream(text: string) {
  for (const word of text.split(' ')) yield word + ' ';
}
\`\`\`

## A table

| Renderer | Package entry | Rich blocks |
|---|---|---|
| Web | \`react-llm-markdown\` | in the page |
| React Native | \`react-llm-markdown/native\` | in a WebView |

## Math

The roots of $$ax^2 + bx + c = 0$$ are

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

## A diagram

\`\`\`mermaid
flowchart LR
  Model -- stream --> Route[Route handler] -- chunks --> Page[MarkdownView]
\`\`\`

## A chart

\`\`\`echarts
{"xAxis":{"type":"category","data":["Mon","Tue","Wed","Thu","Fri"]},"yAxis":{"type":"value"},"series":[{"type":"line","smooth":true,"data":[120,200,150,80,170]}]}
\`\`\`

And what a prompt injection might try is neutralized: [this link](javascript:alert(1)) does nothing.
`;

export async function POST(): Promise<Response> {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (let at = 0; at < ANSWER.length; at += 6) {
        controller.enqueue(encoder.encode(ANSWER.slice(at, at + 6)));
        await new Promise((resolve) => setTimeout(resolve, 12));
      }
      controller.close();
    },
  });
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
}
