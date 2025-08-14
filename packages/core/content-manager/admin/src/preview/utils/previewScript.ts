// NOTE: This override is for the properties on _user's site_, it's not about Strapi Admin.
declare global {
  interface Window {
    __strapi_previewCleanup?: () => void;
    STRAPI_HIGHLIGHT_HOVER_COLOR?: string;
    STRAPI_HIGHLIGHT_ACTIVE_COLOR?: string;
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
  const HIGHLIGHT_ACTIVE_COLOR = window.STRAPI_HIGHLIGHT_ACTIVE_COLOR ?? '#7b79ff'; // dark primary600

  const SOURCE_ATTRIBUTE = 'data-strapi-source';
  const OVERLAY_ID = 'strapi-preview-overlay';
  const INTERNAL_EVENTS = {
    STRAPI_FIELD_FOCUS: 'strapiFieldFocus',
    STRAPI_FIELD_BLUR: 'strapiFieldBlur',
    STRAPI_FIELD_CHANGE: 'strapiFieldChange',
    STRAPI_FIELD_FOCUS_INTENT: 'strapiFieldFocusIntent',
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
   * Utils
   * ---------------------------------------------------------------------------------------------*/

  const sendMessage = (
    type: (typeof INTERNAL_EVENTS)[keyof typeof INTERNAL_EVENTS],
    payload: unknown
  ) => {
    window.parent.postMessage({ type, payload }, '*');
  };

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
    element: HTMLElement | Window;
    type: keyof HTMLElementEventMap | 'message';
    handler: EventListener;
  }>;

  const createHighlightManager = (overlay: HTMLElement) => {
    const elements = window.document.querySelectorAll(`[${SOURCE_ATTRIBUTE}]`);
    const eventListeners: EventListenersList = [];
    const highlights: HTMLElement[] = [];
    const focusedHighlights: HTMLElement[] = [];
    let focusedField: string | null = null;

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
          const sourceAttribute = element.getAttribute(SOURCE_ATTRIBUTE);
          if (sourceAttribute) {
            const rect = element.getBoundingClientRect();
            sendMessage(INTERNAL_EVENTS.STRAPI_FIELD_FOCUS_INTENT, {
              path: sourceAttribute,
              position: {
                top: rect.top,
                left: rect.left,
                right: rect.right,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height,
              },
            });
          }
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
      highlights,
      focusedHighlights,
      setFocusedField: (field: string | null) => {
        focusedField = field;
      },
      getFocusedField: () => focusedField,
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
        element.addEventListener('scroll', updateOnScroll);
      }
    });

    return {
      resizeObserver,
      updateOnScroll,
      scrollableElements,
    };
  };

  const setupEventHandlers = (highlightManager: HighlightManager) => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === INTERNAL_EVENTS.STRAPI_FIELD_CHANGE) {
        const { field, value } = event.data.payload;
        if (field) {
          const matchingElements = document.querySelectorAll(`[${SOURCE_ATTRIBUTE}="${field}"]`);
          matchingElements.forEach((element) => {
            if (element instanceof HTMLElement) {
              element.textContent = value || '';
            }
          });
        }
      } else if (event.data?.type === INTERNAL_EVENTS.STRAPI_FIELD_FOCUS) {
        const { field } = event.data.payload;
        if (field) {
          highlightManager.focusedHighlights.forEach((highlight: HTMLElement) => {
            highlight.style.outlineColor = 'transparent';
          });
          highlightManager.focusedHighlights.length = 0;

          highlightManager.setFocusedField(field);
          const matchingElements = document.querySelectorAll(`[${SOURCE_ATTRIBUTE}="${field}"]`);
          matchingElements.forEach((element) => {
            const highlight =
              highlightManager.highlights[Array.from(highlightManager.elements).indexOf(element)];
            if (highlight) {
              highlight.style.outlineColor = HIGHLIGHT_ACTIVE_COLOR;
              highlight.style.outlineWidth = '3px';
              highlightManager.focusedHighlights.push(highlight);
            }
          });
        }
      } else if (event.data?.type === INTERNAL_EVENTS.STRAPI_FIELD_BLUR) {
        const { field } = event.data.payload;
        if (field === highlightManager.getFocusedField()) {
          highlightManager.focusedHighlights.forEach((highlight: HTMLElement) => {
            highlight.style.outlineColor = 'transparent';
            highlight.style.outlineWidth = '2px';
          });
          highlightManager.focusedHighlights.length = 0;
          highlightManager.setFocusedField(null);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Add the message handler to the cleanup list
    const messageEventListener = {
      element: window,
      type: 'message' as keyof HTMLElementEventMap,
      handler: handleMessage as EventListener,
    };

    return [...highlightManager.eventListeners, messageEventListener];
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
