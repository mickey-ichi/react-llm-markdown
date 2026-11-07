/** A piece of Markdown source: code (fenced block or inline span) or everything else. */
export interface Segment {
  code: boolean;
  text: string;
}

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
/** Inline code: a run of N backticks up to the next run of exactly N. */
const INLINE_CODE = /(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/g;

/**
 * Splits Markdown into code and non-code segments, so source rewrites never touch code. Fenced blocks use ``` or ~~~
 * (3 or more) and end at a closing fence of the same character at least as long — or at the end of the text, for a
 * block still streaming in. Inline code spans use any number of backticks.
 */
export function splitCode(content: string): Segment[] {
  const segments: Segment[] = [];
  const push = (code: boolean, text: string) => {
    if (text === '') return;
    const last = segments.at(-1);
    if (last && last.code === code && code === false) last.text += text;
    else segments.push({ code, text });
  };
  const pushProse = (text: string) => {
    let index = 0;
    for (const match of text.matchAll(INLINE_CODE)) {
      push(false, text.slice(index, match.index));
      push(true, match[0]);
      index = match.index + match[0].length;
    }
    push(false, text.slice(index));
  };

  const lines = content.split(/(?<=\n)/); // keeps each line's newline
  let prose = '';
  for (let i = 0; i < lines.length; i++) {
    const fence = FENCE_OPEN.exec(lines[i]!);
    if (!fence) {
      prose += lines[i];
      continue;
    }
    pushProse(prose);
    prose = '';
    const marker = fence[1]!;
    const close = new RegExp(`^ {0,3}\\${marker[0]}{${marker.length},}[ \\t]*\\n?$`);
    let block = lines[i]!;
    while (++i < lines.length) {
      block += lines[i];
      if (close.test(lines[i]!)) break;
    }
    push(true, block);
  }
  pushProse(prose);
  return segments;
}

/** Applies `rewrite` to the non-code parts of `content` only. */
export function rewriteOutsideCode(content: string, rewrite: (text: string) => string): string {
  return splitCode(content)
    .map((segment) => (segment.code ? segment.text : rewrite(segment.text)))
    .join('');
}
