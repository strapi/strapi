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
  /* -------------------------------------------------------------------------------------------------
   * Params
   * -----------------------------------------------------------------------------------------------*/

  const HIGHLIGHT_PADDING = 2; // in pixels
  const HIGHLIGHT_COLOR = window.__strapi_HIGHLIGHT_COLOR ?? '#4945ff';
  const DISABLE_STEGA_DECODING = window.__strapi_DISABLE_STEGA_DECODING ?? false;
  const SOURCE_ATTRIBUTE = 'data-strapi-source';
  const OVERLAY_ID = 'strapi-preview-overlay';
  const EVENTS = {
    WILL_EDIT_FIELD: 'willEditField',
    STRAPI_READY: 'strapiReady',
    STRAPI_FIELD_TYPING: 'strapiFieldTyping',
    STRAPI_FIELD_FOCUS: 'strapiFieldFocus',
    STRAPI_FIELD_BLUR: 'strapiFieldBlur',
  } as const;

  if (!shouldRun) {
    return { EVENTS };
  }

  /* -----------------------------------------------------------------------------------------------
   * Utils
   * ---------------------------------------------------------------------------------------------*/

  const sendMessage = (type: (typeof EVENTS)[keyof typeof EVENTS], payload: unknown) => {
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
      position: absolute;
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
      highlight.style.transform = `translate(${rect.left - HIGHLIGHT_PADDING + window.scrollX}px, ${rect.top - HIGHLIGHT_PADDING + window.scrollY}px)`;
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
          border-radius: 2px 0 2px 2px;
          background-color: transparent;
          transition: outline-color 0.15s ease-in-out;
        `;

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.style.cssText = `
          position: absolute;
          top: 0px;
          right: -${HIGHLIGHT_PADDING}px;
          transform: translateY(-100%);
          font-size: 12px;
          padding: 4px 8px;
          background: ${HIGHLIGHT_COLOR};
          color: white;
          border: none;
          border-radius: 4px 4px 0 0;
          cursor: pointer;
          pointer-events: auto;
          display: none;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          z-index: 10000;
        `;

        highlight.addEventListener('mouseenter', () => {
          highlight.style.outlineColor = HIGHLIGHT_COLOR;
          editButton.style.display = 'block';
          highlight.style.borderRadius = '2px 0 2px 2px';
        });

        highlight.addEventListener('mouseleave', () => {
          const fieldPath = element.getAttribute(SOURCE_ATTRIBUTE);
          if (fieldPath !== focusedField) {
            highlight.style.outlineColor = 'transparent';
          }
          editButton.style.display = 'none';
          highlight.style.borderRadius = '2px';
        });

        const triggerEdit = (e: Event) => {
          e.stopPropagation();
          e.preventDefault();

          const fieldPath = element.getAttribute(SOURCE_ATTRIBUTE);
          if (fieldPath && window.parent) {
            const rect = element.getBoundingClientRect();
            sendMessage(EVENTS.WILL_EDIT_FIELD, {
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

        editButton.addEventListener('click', triggerEdit);
        highlight.addEventListener('dblclick', triggerEdit);

        highlight.appendChild(editButton);
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
      if (event.data?.type === EVENTS.STRAPI_FIELD_TYPING) {
        const { field, value } = event.data.payload;
        if (field) {
          const matchingElements = document.querySelectorAll(`[${SOURCE_ATTRIBUTE}="${field}"]`);
          matchingElements.forEach((element) => {
            if (element instanceof HTMLElement) {
              element.textContent = value || '';
            }
          });
        }
      } else if (event.data?.type === EVENTS.STRAPI_FIELD_FOCUS) {
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
              highlight.style.outlineColor = HIGHLIGHT_COLOR;
              highlightManager.focusedHighlights.push(highlight);
            }
          });
        }
      } else if (event.data?.type === EVENTS.STRAPI_FIELD_BLUR) {
        const { field } = event.data.payload;
        if (field === highlightManager.getFocusedField()) {
          highlightManager.focusedHighlights.forEach((highlight: HTMLElement) => {
            highlight.style.outlineColor = 'transparent';
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

    window.addEventListener('scroll', updateOnScroll);
    window.addEventListener('resize', updateOnScroll);

    return { resizeObserver, updateOnScroll };
  };

  const createCleanupSystem = (
    overlay: HTMLElement,
    observers: ReturnType<typeof setupObservers>,
    eventHandlers: ReturnType<typeof setupEventHandlers>
  ) => {
    window.__strapi_previewCleanup = () => {
      observers.resizeObserver.disconnect();
      window.removeEventListener('scroll', observers.updateOnScroll);
      window.removeEventListener('resize', observers.updateOnScroll);
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
