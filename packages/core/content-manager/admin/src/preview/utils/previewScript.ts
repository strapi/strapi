// NOTE: This override is for the properties on _user's site_, it's not about Strapi Admin.
declare global {
  interface Window {
    __strapi_previewCleanup?: () => void;
    STRAPI_HIGHLIGHT_HOVER_COLOR?: string;
    STRAPI_HIGHLIGHT_ACTIVE_COLOR?: string;
    STRAPI_DISABLE_STEGA_DECODING?: boolean;
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

  const DISABLE_STEGA_DECODING = window.STRAPI_DISABLE_STEGA_DECODING ?? false;
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

  const setupStegaDOMObserver = async () => {
    if (DISABLE_STEGA_DECODING) {
      return;
    }

    const { vercelStegaDecode: stegaDecode, vercelStegaClean: stegaClean } = await import(
      // @ts-expect-error it's not a local dependency
      // eslint-disable-next-line import/no-unresolved
      'https://cdn.jsdelivr.net/npm/@vercel/stega@0.1.2/+esm'
    );

    const applyStegaToElement = (element: Element) => {
      const directTextNodes = Array.from(element.childNodes).filter(
        (node) => node.nodeType === Node.TEXT_NODE
      );

      const directTextContent = directTextNodes.map((node) => node.textContent || '').join('');

      if (directTextContent) {
        try {
          const result = stegaDecode(directTextContent);
          if (result) {
            element.setAttribute(SOURCE_ATTRIBUTE, result.key);

            // Remove encoded part from DOM text content (to avoid breaking links for example)
            directTextNodes.forEach((node) => {
              if (node.textContent) {
                const cleanedText = stegaClean(node.textContent);
                if (cleanedText !== node.textContent) {
                  node.textContent = cleanedText;
                }
              }
            });
          }
        } catch (error) {}
      }
    };

    // Process all existing elements
    const allElements = document.querySelectorAll('*');
    Array.from(allElements).forEach(applyStegaToElement);

    // Create observer for new elements and text changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Handle added nodes
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              // Process the added element
              applyStegaToElement(element);
              // Process all child elements
              const childElements = element.querySelectorAll('*');
              Array.from(childElements).forEach(applyStegaToElement);
            }
          });
        }

        // Handle text content changes
        if (mutation.type === 'characterData' && mutation.target.parentElement) {
          applyStegaToElement(mutation.target.parentElement);
        }
      });
    });

    observer.observe(document, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return observer;
  };

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
    const elementsToHighlight = new Map<Element, HTMLElement>();
    const eventListeners: EventListenersList = [];
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
      elementsToHighlight.forEach((highlight, element) => {
        drawHighlight(element, highlight);
      });
    };

    const createHighlightForElement = (element: HTMLElement) => {
      if (elementsToHighlight.has(element)) {
        // Already has a highlight
        return;
      }

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
        if (!focusedHighlights.includes(highlight)) {
          highlight.style.outlineColor = HIGHLIGHT_HOVER_COLOR;
        }
      };
      const mouseLeaveHandler = () => {
        if (!focusedHighlights.includes(highlight)) {
          highlight.style.outlineColor = 'transparent';
        }
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

      elementsToHighlight.set(element, highlight);
      overlay.appendChild(highlight);
      drawHighlight(element, highlight);
    };

    const removeHighlightForElement = (element: Element) => {
      const highlight = elementsToHighlight.get(element);

      if (!highlight) return;

      highlight.remove();
      elementsToHighlight.delete(element);

      // Remove event listeners for this element
      const listenersToRemove = eventListeners.filter((listener) => listener.element === element);
      listenersToRemove.forEach(({ element, type, handler }) => {
        element.removeEventListener(type, handler);
      });

      // Mutate eventListeners to remove listeners for this element
      eventListeners.splice(
        0,
        eventListeners.length,
        ...eventListeners.filter((listener) => listener.element !== element)
      );
    };

    // Process all existing elements with source attributes
    const initialElements = window.document.querySelectorAll(`[${SOURCE_ATTRIBUTE}]`);
    Array.from(initialElements).forEach((element) => {
      if (element instanceof HTMLElement) {
        createHighlightForElement(element);
      }
    });

    return {
      get elements() {
        return Array.from(elementsToHighlight.keys());
      },
      get highlights() {
        return Array.from(elementsToHighlight.values());
      },
      updateAllHighlights,
      eventListeners,
      focusedHighlights,
      createHighlightForElement,
      removeHighlightForElement,
      setFocusedField: (field: string | null) => {
        focusedField = field;
      },
      getFocusedField: () => focusedField,
    };
  };

  type HighlightManager = ReturnType<typeof createHighlightManager>;

  const setupObservers = (
    highlightManager: HighlightManager,
    stegaObserver: MutationObserver | undefined
  ) => {
    const resizeObserver = new ResizeObserver(() => {
      highlightManager.updateAllHighlights();
    });

    const observeElementForResize = (element: Element) => {
      resizeObserver.observe(element);
    };

    // Observe existing elements
    highlightManager.elements.forEach(observeElementForResize);
    resizeObserver.observe(document.documentElement);

    // Create highlight observer to watch for new elements with source attributes
    const highlightObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === SOURCE_ATTRIBUTE) {
          const target = mutation.target as HTMLElement;
          if (target.hasAttribute(SOURCE_ATTRIBUTE)) {
            highlightManager.createHighlightForElement(target);
            observeElementForResize(target);
          } else {
            highlightManager.removeHighlightForElement(target);
          }
        }

        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              // Check if the added element has source attribute
              if (element.hasAttribute(SOURCE_ATTRIBUTE) && element instanceof HTMLElement) {
                highlightManager.createHighlightForElement(element);
                observeElementForResize(element);
              }
              // Check all child elements for source attributes
              const elementsWithSource = element.querySelectorAll(`[${SOURCE_ATTRIBUTE}]`);
              Array.from(elementsWithSource).forEach((childElement) => {
                if (childElement instanceof HTMLElement) {
                  highlightManager.createHighlightForElement(childElement);
                  observeElementForResize(childElement);
                }
              });
            }
          });

          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              highlightManager.removeHighlightForElement(element);
            }
          });
        }
      });
    });

    highlightObserver.observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [SOURCE_ATTRIBUTE],
    });

    const updateOnScroll = () => {
      highlightManager.updateAllHighlights();
    };

    const scrollableElements = new Set<Element | Window>();
    scrollableElements.add(window);

    /**
     * We need to find all the parents that are scrollable in order to keep the highlight positions
     * up to date with the element position. Because the element position changes on the screen when
     * one of the parents (not just the window) is scrolled.
     */
    const findScrollableAncestors = () => {
      // Clear existing scrollable elements (except window)
      scrollableElements.forEach((element) => {
        if (element !== window) {
          (element as Element).removeEventListener('scroll', updateOnScroll);
        }
      });
      scrollableElements.clear();
      scrollableElements.add(window);

      // Find all scrollable ancestors for all tracked elements
      highlightManager.elements.forEach((element) => {
        let parent = element.parentElement;
        while (parent) {
          const computedStyle = window.getComputedStyle(parent);
          const overflow =
            computedStyle.overflow + computedStyle.overflowX + computedStyle.overflowY;

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
    };

    // Initial setup of scrollable elements
    findScrollableAncestors();

    return {
      resizeObserver,
      highlightObserver,
      stegaObserver,
      updateOnScroll,
      scrollableElements,
    };
  };

  const setupEventHandlers = (highlightManager: HighlightManager) => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data?.type) return;

      // The user typed in an input, reflect the change in the preview
      if (event.data.type === INTERNAL_EVENTS.STRAPI_FIELD_CHANGE) {
        const { field, value } = event.data.payload;
        if (!field) return;

        const matchingElements = document.querySelectorAll(`[${SOURCE_ATTRIBUTE}="${field}"]`);
        matchingElements.forEach((element) => {
          if (element instanceof HTMLElement) {
            element.textContent = value || '';
          }
        });

        // Update highlight dimensions since the new text content may affect them
        highlightManager.updateAllHighlights();
        return;
      }

      // The user focused a new input, update the highlights in the preview
      if (event.data.type === INTERNAL_EVENTS.STRAPI_FIELD_FOCUS) {
        const { field } = event.data.payload;
        if (!field) return;

        // Clear existing focused highlights
        highlightManager.focusedHighlights.forEach((highlight: HTMLElement) => {
          highlight.style.outlineColor = 'transparent';
        });
        highlightManager.focusedHighlights.length = 0;

        // Set new focused field and highlight matching elements
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
        return;
      }

      // The user is no longer focusing an input, remove the highlights
      if (event.data.type === INTERNAL_EVENTS.STRAPI_FIELD_BLUR) {
        const { field } = event.data.payload;
        if (field !== highlightManager.getFocusedField()) return;

        highlightManager.focusedHighlights.forEach((highlight: HTMLElement) => {
          highlight.style.outlineColor = 'transparent';
          highlight.style.outlineWidth = '2px';
        });
        highlightManager.focusedHighlights.length = 0;
        highlightManager.setFocusedField(null);
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
      observers.highlightObserver.disconnect();
      observers.stegaObserver?.disconnect();

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

  setupStegaDOMObserver().then((stegaObserver) => {
    const overlay = createOverlaySystem();
    const highlightManager = createHighlightManager(overlay);
    const observers = setupObservers(highlightManager, stegaObserver);
    const eventHandlers = setupEventHandlers(highlightManager);
    createCleanupSystem(overlay, observers, eventHandlers);
  });
};

export { previewScript };
