import * as React from 'react';

/**
 * Hook that returns a ref to an element and a boolean indicating if the element is in the viewport
 * or in the element specified in `options.root`.
 */
const useElementOnScreen = <TElement extends HTMLElement = HTMLElement>(
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
): React.RefObject<TElement> => {
  const containerRef = React.useRef<TElement>(null);
  const id = React.useId();

  React.useEffect(() => {
    const containerEl = containerRef.current;
    const observer = new IntersectionObserver(callback, options);

    if (containerEl) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerEl) {
        observer.disconnect();
      }
    };
  }, [containerRef, options, callback, id]);

  return containerRef;
};

export { useElementOnScreen };
