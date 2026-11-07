import { sanitizeMarkdownUrl } from '../core/security.ts';

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

/** Prefix for ids and names from the document, as GitHub does (footnotes already carry it). */
export const CLOBBER_PREFIX = 'user-content-';
const CLOBBER_PROPERTIES = ['id', 'name'] as const;
const ID_REFERENCES = ['ariaDescribedBy', 'ariaLabelledBy'] as const;

const prefixed = (value: string) => (value.startsWith(CLOBBER_PREFIX) ? value : CLOBBER_PREFIX + value);

/**
 * Runs after rehype-sanitize, in place of Streamdown's rehype-harden:
 *
 * - **URLs**: every link and image goes through {@link sanitizeMarkdownUrl} (http, https, mailto and relative only).
 *   A relative URL is kept exactly as written — rehype-harden resolved them against a dummy origin, so `../guide.md`
 *   became `/guide.md` and a bare `guide.md` was blocked. A refused link keeps its text without an `href`; a refused
 *   image is removed (and never requested).
 * - **DOM clobbering**: `id` and `name` from the document get the `user-content-` prefix (Streamdown turns the
 *   sanitizer's prefix off), so `<div id="root">` cannot shadow `window.root` or the host page's own elements.
 *   `aria-describedby` / `aria-labelledby` are prefixed the same way so they still point at their targets.
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
      for (const key of CLOBBER_PROPERTIES) {
        if (typeof props[key] === 'string' && props[key] !== '') props[key] = prefixed(props[key]);
      }
      for (const key of ID_REFERENCES) {
        const value = props[key];
        if (Array.isArray(value)) props[key] = value.map((id) => prefixed(String(id)));
        else if (typeof value === 'string' && value !== '') props[key] = value.split(/\s+/).map(prefixed).join(' ');
      }
      visit(child);
      return true;
    });
  };
  return (tree: HastNode) => visit(tree);
}
