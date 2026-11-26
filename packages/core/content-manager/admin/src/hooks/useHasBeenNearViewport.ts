import * as React from 'react';

/**
 * How far outside of the scroll container an element counts as near the viewport, so scrolling
 * doesn't reveal content that is still being mounted or loaded.
 */
const NEAR_VIEWPORT_MARGIN = '1200px 0px';

const getScrollParent = (element: HTMLElement | null): HTMLElement | null => {
  for (let node = element?.parentElement; node; node = node.parentElement) {
    const { overflowY } = window.getComputedStyle(node);

    if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight) {
      return node;
    }
  }

  return null;
};

/**
 * Returns `true` once the element has come close to the viewport of its scroll container, then
 * keeps returning `true`. Without `IntersectionObserver` (e.g. JSDOM), it always returns `true`.
 */
const useHasBeenNearViewport = <TElement extends HTMLElement>(ref: React.RefObject<TElement>) => {
  const [hasBeenNearViewport, setHasBeenNearViewport] = React.useState(
    () => typeof IntersectionObserver === 'undefined'
  );

  React.useEffect(() => {
    const element = ref.current;

    if (hasBeenNearViewport || !element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setHasBeenNearViewport(true);
        }
      },
      { root: getScrollParent(element), rootMargin: NEAR_VIEWPORT_MARGIN }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [hasBeenNearViewport, ref]);

  return hasBeenNearViewport;
};

export { useHasBeenNearViewport, getScrollParent, NEAR_VIEWPORT_MARGIN };
