import { sanitizeMarkdownUrl } from '../core/security.ts';

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

/**
 * Applies the URL policy ({@link sanitizeMarkdownUrl}: http, https, mailto and relative only) to every link and
 * image, after rehype-sanitize.
 *
 * It takes the place of Streamdown's rehype-harden, which applies the same kind of protocol allowlist but resolves
 * relative URLs against a dummy origin: `../guide.md` became `/guide.md` and a bare `guide.md` was blocked, so links
 * between documents broke. Here a relative URL is kept exactly as written. A refused link keeps its text without an
 * `href`; a refused image is removed (and so never requested).
 */
export function rehypeUrlPolicy() {
  const visit = (node: HastNode): void => {
    if (!node.children) return;
    node.children = node.children.filter((child) => {
      if (child.type !== 'element') return true;
      const props = child.properties ?? {};
      if (child.tagName === 'a' && typeof props.href === 'string') {
        const href = sanitizeMarkdownUrl(props.href);
        if (href === null) delete props.href;
        else props.href = href;
      }
      if (child.tagName === 'img') {
        const src = typeof props.src === 'string' ? sanitizeMarkdownUrl(props.src) : null;
        if (src === null) return false;
        props.src = src;
      }
      visit(child);
      return true;
    });
  };
  return (tree: HastNode) => visit(tree);
}
