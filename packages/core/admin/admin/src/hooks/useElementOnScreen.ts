import * as React from 'react';

/**
 * Hook that returns a ref to an element and a boolean indicating if the element is in the viewport
 * or in the element specified in `options.root`.
 */
const useElementOnScreen = <TElement extends HTMLElement = HTMLElement>(
  onVisiblityChange: (isVisible: boolean) => void,
  options?: IntersectionObserverInit
): React.RefObject<TElement> => {
  const containerRef = React.useRef<TElement>(null);

  React.useEffect(() => {
    const containerEl = containerRef.current;
    const observer = new IntersectionObserver(([entry]) => {
      onVisiblityChange(entry.isIntersecting);
    }, options);

    if (containerEl) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerEl) {
        observer.disconnect();
      }
    };
  }, [containerRef, options, onVisiblityChange]);

  return containerRef;
};

export { useElementOnScreen };
