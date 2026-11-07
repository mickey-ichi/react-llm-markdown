/**
 * Remark transformer that renders a single newline as a line break (chat-style Markdown).
 *
 * `remark-breaks` is not used: its micromark extension consumes line endings while parsing, before
 * GFM's table extension can match rows, so tables fall back to raw pipe text. This plugin runs on
 * the finished mdast instead — after tables, lists, code and math are built — and only splits the
 * `\n` left inside `text` nodes. Code and math keep their source in `value` on their own node
 * types, so they are never rewritten.
 */

interface MdastNode {
  type: string;
  value?: string;
  children?: MdastNode[];
}

const LINE_ENDING = /\r?\n|\r/;

function splitTextNode(node: MdastNode): MdastNode[] {
  const nodes: MdastNode[] = [];
  (node.value ?? '').split(LINE_ENDING).forEach((line, index) => {
    if (index > 0) nodes.push({ type: 'break' });
    if (line !== '') nodes.push({ type: 'text', value: line });
  });
  return nodes;
}

function transform(node: MdastNode): void {
  if (!node.children) return;
  const children: MdastNode[] = [];
  for (const child of node.children) {
    if (child.type === 'text' && child.value && LINE_ENDING.test(child.value)) {
      children.push(...splitTextNode(child));
    } else {
      transform(child);
      children.push(child);
    }
  }
  node.children = children;
}

export function remarkSoftBreaks() {
  return (tree: MdastNode) => {
    transform(tree);
  };
}
