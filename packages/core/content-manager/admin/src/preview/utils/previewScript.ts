// NOTE: This override is for the properties on _user's site_, it's not about Strapi Admin.
declare global {
  interface Window {
    __strapi_previewCleanup?: () => void;
    STRAPI_HIGHLIGHT_HOVER_COLOR?: string;
  }
}

/**
 * previewScript will be injected into the preview iframe after being stringified.
 * Therefore it CANNOT use any imports, or refer to any variables outside of its own scope.
 * It's why many functions are defined within previewScript, it's the only way to avoid going full spaghetti.
 * To get a better overview of everything previewScript does, go to the orchestration part at its end.
 */
const previewScript = (shouldRun = true) => {
  /* -----------------------------------------------------------------------------------------------
   * Params
   * ---------------------------------------------------------------------------------------------*/
  const HIGHLIGHT_PADDING = 2; // in pixels
  const HIGHLIGHT_HOVER_COLOR = window.STRAPI_HIGHLIGHT_HOVER_COLOR ?? '#4945ff'; // dark primary500
  const SOURCE_ATTRIBUTE = 'data-strapi-source';
  const OVERLAY_ID = 'strapi-preview-overlay';
  const INTERNAL_EVENTS = {
    DUMMY_EVENT: 'dummyEvent',
  } as const;

  /**
   * Calling the function in no-run mode lets us retrieve the constants from other files and keep
   * a single source of truth for them. It's the only way to do this because this script can't
   * refer to any variables outside of its own scope, because it's stringified before it's run.
   */
  if (!shouldRun) {
    return { INTERNAL_EVENTS };
  }

  /* -----------------------------------------------------------------------------------------------
   * Functionality pieces
   * ---------------------------------------------------------------------------------------------*/

  const createOverlaySystem = () => {
    // Clean up before creating a new overlay so we can safely call previewScript multiple times
    window.__strapi_previewCleanup?.();
    document.getElementById(OVERLAY_ID)?.remove();

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    `;

    window.document.body.appendChild(overlay);
    return overlay;
  };

  type EventListenersList = Array<{
    element: HTMLElement;
    type: keyof HTMLElementEventMap;
    handler: EventListener;
  }>;

  const createHighlightManager = (overlay: HTMLElement) => {
    const elements = window.document.querySelectorAll(`[${SOURCE_ATTRIBUTE}]`);
    const highlights: HTMLElement[] = [];
    const eventListeners: EventListenersList = [];

    const drawHighlight = (target: Element, highlight: HTMLElement) => {
      if (!highlight) return;

      const rect = target.getBoundingClientRect();
      highlight.style.width = `${rect.width + HIGHLIGHT_PADDING * 2}px`;
      highlight.style.height = `${rect.height + HIGHLIGHT_PADDING * 2}px`;
      highlight.style.transform = `translate(${rect.left - HIGHLIGHT_PADDING}px, ${rect.top - HIGHLIGHT_PADDING}px)`;
    };

    const updateAllHighlights = () => {
      highlights.forEach((highlight, index) => {
        const element = elements[index];
        if (element && highlight) {
          drawHighlight(element, highlight);
        }
      });
    };

    elements.forEach((element) => {
      if (element instanceof HTMLElement) {
        const highlight = document.createElement('div');
        highlight.style.cssText = `
          position: absolute;
          outline: 2px solid transparent;
          pointer-events: none;
          border-radius: 2px;
          background-color: transparent;
          will-change: transform;
          transition: outline-color 0.1s ease-in-out;
        `;

        // Move hover detection to the underlying element
        const mouseEnterHandler = () => {
          highlight.style.outlineColor = HIGHLIGHT_HOVER_COLOR;
        };
        const mouseLeaveHandler = () => {
          highlight.style.outlineColor = 'transparent';
        };
        const doubleClickHandler = () => {
          // TODO: handle for real
          // eslint-disable-next-line no-console
          console.log('Double click on highlight', element);
        };
        const mouseDownHandler = (event: MouseEvent) => {
          // Prevent default multi click to select behavior
          if (event.detail >= 2) {
            event.preventDefault();
          }
        };

        element.addEventListener('mouseenter', mouseEnterHandler);
        element.addEventListener('mouseleave', mouseLeaveHandler);
        element.addEventListener('dblclick', doubleClickHandler);
        element.addEventListener('mousedown', mouseDownHandler);

        // Store event listeners for cleanup
        eventListeners.push(
          { element, type: 'mouseenter', handler: mouseEnterHandler },
          { element, type: 'mouseleave', handler: mouseLeaveHandler },
          { element, type: 'dblclick', handler: doubleClickHandler },
          { element, type: 'mousedown', handler: mouseDownHandler as EventListener }
        );

        highlights.push(highlight);
        overlay.appendChild(highlight);

        drawHighlight(element, highlight);
      }
    });

    return {
      elements,
      updateAllHighlights,
      eventListeners,
    };
  };

  type HighlightManager = ReturnType<typeof createHighlightManager>;

  const setupObservers = (highlightManager: HighlightManager) => {
    const resizeObserver = new ResizeObserver(() => {
      highlightManager.updateAllHighlights();
    });

    highlightManager.elements.forEach((element: Element) => {
      resizeObserver.observe(element);
    });

    resizeObserver.observe(document.documentElement);

    const updateOnScroll = () => {
      highlightManager.updateAllHighlights();
    };

    const scrollableElements = new Set<Element | Window>();
    scrollableElements.add(window);

    // Find all scrollable ancestors for all tracked elements
    highlightManager.elements.forEach((element) => {
      let parent = element.parentElement;
      while (parent) {
        const computedStyle = window.getComputedStyle(parent);
        const overflow = computedStyle.overflow + computedStyle.overflowX + computedStyle.overflowY;

        if (overflow.includes('scroll') || overflow.includes('auto')) {
          scrollableElements.add(parent);
        }

        parent = parent.parentElement;
      }
    });

    // Add scroll listeners to all scrollable elements
    scrollableElements.forEach((element) => {
      if (element === window) {
        window.addEventListener('scroll', updateOnScroll);
        window.addEventListener('resize', updateOnScroll);
      } else {
        (element as Element).addEventListener('scroll', updateOnScroll);
      }
    });

    return {
      resizeObserver,
      updateOnScroll,
      scrollableElements,
    };
  };

  const setupEventHandlers = (highlightManager: HighlightManager) => {
    // TODO: The listeners for postMessage events will go here
    return highlightManager.eventListeners;
  };

  const createCleanupSystem = (
    overlay: HTMLElement,
    observers: ReturnType<typeof setupObservers>,
    eventHandlers: EventListenersList
  ) => {
    window.__strapi_previewCleanup = () => {
      observers.resizeObserver.disconnect();

      // Remove all scroll listeners
      observers.scrollableElements.forEach((element) => {
        if (element === window) {
          window.removeEventListener('scroll', observers.updateOnScroll);
          window.removeEventListener('resize', observers.updateOnScroll);
        } else {
          (element as Element).removeEventListener('scroll', observers.updateOnScroll);
        }
      });

      // Remove highlight event listeners
      eventHandlers.forEach(({ element, type, handler }) => {
        element.removeEventListener(type, handler);
      });

      overlay.remove();
    };
  };

  /* -----------------------------------------------------------------------------------------------
   * Orchestration
   * ---------------------------------------------------------------------------------------------*/

  const overlay = createOverlaySystem();
  const highlightManager = createHighlightManager(overlay);
  const observers = setupObservers(highlightManager);
  const eventHandlers = setupEventHandlers(highlightManager);
  createCleanupSystem(overlay, observers, eventHandlers);
};

export { previewScript };
