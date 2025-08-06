// NOTE: This override is for the properties on _user's site_, it's not about Strapi Admin.
declare global {
  interface Window {
    __strapi_previewCleanup?: () => void;
    __strapi_HIGHLIGHT_COLOR?: string;
    __strapi_DISABLE_STEGA_DECODING?: boolean;
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
  const HIGHLIGHT_HOVER_COLOR = window.__strapi_HIGHLIGHT_COLOR ?? '#4945ff'; // dark primary500
  const HIGHLIGHT_ACTIVE_COLOR = window.__strapi_HIGHLIGHT_COLOR ?? '#7b79ff'; // dark primary600
  const DISABLE_STEGA_DECODING = window.__strapi_DISABLE_STEGA_DECODING ?? false;
  const SOURCE_ATTRIBUTE = 'data-strapi-source';
  const OVERLAY_ID = 'strapi-preview-overlay';
  const INTERNAL_EVENTS = {
    WILL_EDIT_FIELD: 'willEditField',
    STRAPI_FIELD_TYPING: 'strapiFieldTyping',
    STRAPI_FIELD_FOCUS: 'strapiFieldFocus',
    STRAPI_FIELD_BLUR: 'strapiFieldBlur',
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
   * Functional blocks
   * ---------------------------------------------------------------------------------------------*/

  const setupStegaDecoding = async () => {
    if (DISABLE_STEGA_DECODING) {
      return;
    }

    const { vercelStegaDecode: stegaDecode } = await import(
      // @ts-expect-error it's not a local dependency
      // eslint-disable-next-line import/no-unresolved
      'https://cdn.jsdelivr.net/npm/@vercel/stega@0.1.2/+esm'
    );

    const allElements = document.querySelectorAll('*');

    Array.from(allElements).forEach((element) => {
      const directTextContent = Array.from(element.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent || '')
        .join('');

      if (directTextContent) {
        try {
          const result = stegaDecode(directTextContent);
          if (result) {
            element.setAttribute(SOURCE_ATTRIBUTE, result.key);
          }
        } catch (error) {}
      }
    });
  };

  const createOverlaySystem = () => {
    const existingOverlay = document.getElementById(OVERLAY_ID);
    if (existingOverlay) {
      existingOverlay.remove();
    }

    window.__strapi_previewCleanup?.();

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

  const createHighlightManager = (overlay: HTMLElement) => {
    const elements = window.document.querySelectorAll(`[${SOURCE_ATTRIBUTE}]`);
    const highlights: HTMLElement[] = [];
    let focusedField: string | null = null;
    const focusedHighlights: HTMLElement[] = [];

    const drawOverlay = (target: Element, highlight: HTMLElement) => {
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
          drawOverlay(element, highlight);
        }
      });
    };

    elements.forEach((element) => {
      if (element instanceof HTMLElement) {
        const highlight = document.createElement('div');
        highlight.style.cssText = `
          position: absolute;
          outline: 2px solid transparent;
          pointer-events: auto;
          border-radius: 2px;
          background-color: transparent;
          will-change: transform;
          transition: outline-color 0.1s ease-in-out;
        `;

        highlight.addEventListener('mouseenter', () => {
          highlight.style.outlineColor = HIGHLIGHT_HOVER_COLOR;
        });

        highlight.addEventListener('mouseleave', () => {
          const fieldPath = element.getAttribute(SOURCE_ATTRIBUTE);
          if (fieldPath !== focusedField) {
            highlight.style.outlineColor = 'transparent';
          }
        });

        const triggerEdit = (e: Event) => {
          e.stopPropagation();
          e.preventDefault();

          const fieldPath = element.getAttribute(SOURCE_ATTRIBUTE);
          if (fieldPath && window.parent) {
            const rect = element.getBoundingClientRect();
            sendMessage(INTERNAL_EVENTS.WILL_EDIT_FIELD, {
              path: fieldPath,
              position: {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
              },
            });
          }
        };

        highlight.addEventListener('dblclick', triggerEdit);

        highlights.push(highlight);
        overlay.appendChild(highlight);

        drawOverlay(element, highlight);
      }
    });

    return {
      elements,
      highlights,
      focusedField,
      focusedHighlights,
      updateAllHighlights,
      setFocusedField: (field: string | null) => {
        focusedField = field;
      },
      getFocusedField: () => focusedField,
    };
  };

  type HighlightManager = ReturnType<typeof createHighlightManager>;

  const setupEventHandlers = (highlightManager: HighlightManager) => {
    const handleMessages = (event: MessageEvent) => {
      if (event.data?.type === INTERNAL_EVENTS.STRAPI_FIELD_TYPING) {
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

    window.addEventListener('message', handleMessages);
    return { handleMessages };
  };

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

    // Find all scrollable ancestors for all tracked elements
    const scrollableElements = new Set<Element | Window>();
    scrollableElements.add(window); // Add window as a special case

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

  const createCleanupSystem = (
    overlay: HTMLElement,
    observers: ReturnType<typeof setupObservers>,
    eventHandlers: ReturnType<typeof setupEventHandlers>
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

      window.removeEventListener('message', eventHandlers.handleMessages);
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    };
  };

  /* -----------------------------------------------------------------------------------------------
   * Orchestration
   * ---------------------------------------------------------------------------------------------*/

  setupStegaDecoding().then(() => {
    const overlay = createOverlaySystem();
    const highlightManager = createHighlightManager(overlay);
    const eventHandlers = setupEventHandlers(highlightManager);
    const observers = setupObservers(highlightManager);
    createCleanupSystem(overlay, observers, eventHandlers);
  });
};

export { previewScript };
