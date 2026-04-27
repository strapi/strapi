// NOTE: This override is for the properties on _user's site_, it's not about Strapi Admin.
declare global {
  interface Window {
    __strapi_previewCleanup?: () => void;
    /** Handler registries preserved across re-injections of the preview script. */
    __strapiPreviewRegistries?: {
      fieldHandlers: Map<string, StrapiPreviewFieldHandler>;
      typeHandlers: Map<string, StrapiPreviewFieldHandler>;
    };
    STRAPI_HIGHLIGHT_HOVER_COLOR?: string;
    STRAPI_HIGHLIGHT_ACTIVE_COLOR?: string;
    STRAPI_DISABLE_STEGA_DECODING?: boolean;
    /**
     * Public Strapi live-preview API exposed inside the preview iframe.
     *
     * Integrators register handlers to customize how field changes are reflected
     * in the preview. Resolution order for every field-change event:
     *
     *   1. onField(path) — most specific
     *   2. onType(type) — for all fields of a type
     *   3. built-in default for the type (Strapi ships one for `media`)
     *   4. full-page refresh fallback (signaled via an internal message)
     *
     * Handlers return `false` to pass through to the next handler in the chain.
     * Anything else means the change was handled.
     */
    strapiPreview?: {
      /** Public API version. Integrators can check this to gate on capabilities. */
      version: number;
      onType(type: string, handler: StrapiPreviewFieldHandler): void;
      onField(path: string, handler: StrapiPreviewFieldHandler): void;
      /** Deregister a handler by its path (onField key) or type (onType key). */
      off(key: string): void;
    };
  }

  type StrapiPreviewFieldHandler = (
    value: unknown,
    element: Element,
    meta: { path: string; type: string }
  ) => boolean | void;
}

/**
 * previewScript will be injected into the preview iframe after being stringified.
 * Therefore it CANNOT use any imports, or refer to any variables outside of its own scope.
 * It's why many functions are defined within previewScript, it's the only way to avoid going full spaghetti.
 * To get a better overview of everything previewScript does, go to the orchestration part at its end.
 */
type PreviewScriptColors = {
  highlightHoverColor: string;
  highlightActiveColor: string;
};

type PreviewScriptConfig = {
  shouldRun?: boolean;
  colors: PreviewScriptColors;
};

const previewScript = (config: PreviewScriptConfig) => {
  const { shouldRun = true, colors } = config;

  /* -----------------------------------------------------------------------------------------------
   * Params
   * ---------------------------------------------------------------------------------------------*/
  const HIGHLIGHT_PADDING = 2; // in pixels
  const HIGHLIGHT_HOVER_COLOR = window.STRAPI_HIGHLIGHT_HOVER_COLOR ?? colors.highlightHoverColor;
  const HIGHLIGHT_ACTIVE_COLOR =
    window.STRAPI_HIGHLIGHT_ACTIVE_COLOR ?? colors.highlightActiveColor;
  const HIGHLIGHT_STYLES_ID = 'strapi-preview-highlight-styles';
  const DOUBLE_CLICK_TIMEOUT = 300; // milliseconds to wait for potential double-click

  const DISABLE_STEGA_DECODING = window.STRAPI_DISABLE_STEGA_DECODING ?? false;
  const SOURCE_ATTRIBUTE = 'data-strapi-source';
  const OVERLAY_ID = 'strapi-preview-overlay';
  const INTERNAL_EVENTS = {
    STRAPI_FIELD_FOCUS: 'strapiFieldFocus',
    STRAPI_FIELD_BLUR: 'strapiFieldBlur',
    STRAPI_FIELD_CHANGE: 'strapiFieldChange',
    STRAPI_FIELD_FOCUS_INTENT: 'strapiFieldFocusIntent',
    STRAPI_FIELD_SINGLE_CLICK_HINT: 'strapiFieldSingleClickHint',
    /**
     * Iframe → admin. Signals that a field change could not be resolved in-place and no
     * scoped-refresh handler was registered. The admin responds with the existing strapiUpdate
     * full-page refresh so the preview never gets stuck in a stale state.
     */
    STRAPI_FIELD_REPLACE_UNHANDLED: 'strapiFieldReplaceUnhandled',
  } as const;

  /* -----------------------------------------------------------------------------------------------
   * Pure helpers (no closure dependencies beyond their own arguments)
   *
   * Exposed via the no-run return so they can be unit-tested in jsdom without invoking the full
   * IIFE. Keep them here, at the top of the function, so they're reachable before the no-run
   * early return below.
   * ---------------------------------------------------------------------------------------------*/

  const MEDIA_TAGS = ['img', 'video', 'picture'] as const;

  type MediaValue = {
    url?: string | null;
    mime?: string | null;
    alternativeText?: string | null;
    previewUrl?: string | null;
  };

  const getMimePrefix = (mime: unknown): string => {
    if (typeof mime !== 'string') return '';
    const slashIndex = mime.indexOf('/');
    return slashIndex > 0 ? mime.slice(0, slashIndex) : mime;
  };

  const findMediaTarget = (root: Element | null): Element | null => {
    if (!root) return null;
    const tag = root.tagName.toLowerCase();
    if ((MEDIA_TAGS as readonly string[]).includes(tag)) {
      return root;
    }
    return root.querySelector(MEDIA_TAGS.join(','));
  };

  /**
   * Resolve a media URL from the admin's payload against the current element's attribute so
   * relative paths (e.g. `/uploads/photo.jpg` from Strapi's local upload provider) keep working
   * when the preview iframe lives on a different origin than the Strapi server.
   *
   * Rules:
   *   - payload URL is absolute / data-url → use as-is
   *   - payload URL is relative AND current attribute is absolute → prepend current origin
   *   - otherwise → use as-is (best effort; the browser may 404 but we don't guess)
   */
  const resolveMediaUrl = (newUrl: string, currentAttrValue: string | null): string => {
    if (!newUrl) return newUrl;
    if (
      newUrl.startsWith('http://') ||
      newUrl.startsWith('https://') ||
      newUrl.startsWith('//') ||
      newUrl.startsWith('data:') ||
      newUrl.startsWith('blob:')
    ) {
      return newUrl;
    }
    if (!currentAttrValue) return newUrl;
    const match = /^(https?:)?\/\/[^/]+/.exec(currentAttrValue);
    if (!match) return newUrl;
    // Ensure the relative URL starts with a leading slash so the join is unambiguous.
    return match[0] + (newUrl.startsWith('/') ? newUrl : `/${newUrl}`);
  };

  const patchMediaElement = (target: Element | null, value: MediaValue | null): boolean => {
    if (!target || !value || typeof value !== 'object') return false;
    const rawUrl = typeof value.url === 'string' ? value.url : '';
    if (!rawUrl) return false;

    const tag = target.tagName.toLowerCase();
    const newMimePrefix = getMimePrefix(value.mime);

    if (tag === 'img') {
      if (newMimePrefix && newMimePrefix !== 'image') return false;
      const resolved = resolveMediaUrl(rawUrl, target.getAttribute('src'));
      target.setAttribute('src', resolved);
      target.removeAttribute('srcset');
      if (typeof value.alternativeText === 'string') {
        target.setAttribute('alt', value.alternativeText);
      }
      return true;
    }

    if (tag === 'video') {
      if (newMimePrefix && newMimePrefix !== 'video') return false;
      const resolved = resolveMediaUrl(rawUrl, target.getAttribute('src'));
      target.setAttribute('src', resolved);
      if (typeof value.previewUrl === 'string') {
        const poster = resolveMediaUrl(value.previewUrl, target.getAttribute('poster'));
        target.setAttribute('poster', poster);
      }
      return true;
    }

    if (tag === 'picture') {
      if (newMimePrefix && newMimePrefix !== 'image') return false;
      const sources = target.querySelectorAll('source');
      sources.forEach((source) => {
        const resolved = resolveMediaUrl(rawUrl, source.getAttribute('srcset'));
        source.setAttribute('srcset', resolved);
      });
      const img = target.querySelector('img');
      if (img) {
        const resolved = resolveMediaUrl(rawUrl, img.getAttribute('src'));
        img.setAttribute('src', resolved);
        if (typeof value.alternativeText === 'string') {
          img.setAttribute('alt', value.alternativeText);
        }
      }
      return true;
    }

    return false;
  };

  /**
   * Calling the function in no-run mode lets us retrieve the constants from other files and keep
   * a single source of truth for them. It's the only way to do this because this script can't
   * refer to any variables outside of its own scope, because it's stringified before it's run.
   */
  /* -----------------------------------------------------------------------------------------------
   * Handler chain (scoped-refresh primitive)
   *
   * The dispatch chain is resolution-order independent of any registries — it takes them as an
   * argument. The runtime portion of the IIFE wires up the actual `fieldHandlers` / `typeHandlers`
   * Maps (preserved on `window` across re-injections) and the built-in type defaults.
   * ---------------------------------------------------------------------------------------------*/

  type FieldHandler = StrapiPreviewFieldHandler;

  /**
   * Built-in default for `media` fields. Safe in any framework because it only mutates
   * attributes on an existing DOM node — it never removes, replaces, or inserts elements.
   *
   * Handled cases:
   *   - same-kind swap (image→image, video→video): delegates to patchMediaElement
   *   - populated → empty: clears src / srcset / alt / poster on the target
   *
   * Deferred to the integrator (register via window.strapiPreview.onType('media', ...)):
   *   - cross-kind swap (image ↔ video): needs to change the rendered tag, which requires
   *     framework cooperation to re-render with new data. Direct DOM replacement crashes
   *     React-managed subtrees on next reconciliation.
   *   - empty → populated: no marker element exists in the DOM to target.
   *
   * Either returns `true` when a change was applied, or `false` to signal "unhandled" — the
   * admin does NOT force a full-page refresh on unhandled signals, so other in-flight
   * live-preview patches are preserved.
   */
  const BUILT_IN_MEDIA_HANDLER: FieldHandler = (value, element) => {
    if (!(element instanceof HTMLElement)) return false;
    const target = findMediaTarget(element);
    if (!target) return false;

    const currentTag = target.tagName.toLowerCase();

    // Populated → empty: clear attributes rather than removing the element so the marker
    // stays in the DOM and future changes can still find a target. Attribute-only mutation
    // is safe for framework-managed nodes (no fiber invariants are broken).
    if (value == null) {
      if (currentTag === 'img') {
        target.removeAttribute('src');
        target.removeAttribute('srcset');
        target.removeAttribute('alt');
      } else if (currentTag === 'video') {
        target.removeAttribute('src');
        target.removeAttribute('poster');
      } else if (currentTag === 'picture') {
        target.querySelectorAll('source').forEach((s) => s.removeAttribute('srcset'));
        const img = target.querySelector('img');
        if (img) {
          img.removeAttribute('src');
          img.removeAttribute('alt');
        }
      }
      return true;
    }

    if (typeof value !== 'object') return false;
    const mime = typeof (value as MediaValue).mime === 'string' ? (value as MediaValue).mime! : '';
    const mimePrefix = getMimePrefix(mime);

    const currentKind: 'image' | 'video' | null =
      currentTag === 'img' || currentTag === 'picture'
        ? 'image'
        : currentTag === 'video'
          ? 'video'
          : null;

    if (currentKind && currentKind === mimePrefix) {
      // Same kind — in-place attribute patch (safe in any framework)
      return patchMediaElement(target, value as MediaValue);
    }

    // Cross-kind: defer to an integrator-registered handler (see doc block above).
    return false;
  };

  /**
   * Resolve the ordered list of handlers to try for a given (field, type) pair.
   * Order: onField (most specific) → onType → built-in type default.
   */
  const resolveHandlerChain = (
    field: string,
    type: string,
    registries: {
      fieldHandlers: Map<string, FieldHandler>;
      typeHandlers: Map<string, FieldHandler>;
      builtInTypeHandlers: Map<string, FieldHandler>;
    }
  ): FieldHandler[] => {
    return [
      registries.fieldHandlers.get(field),
      registries.typeHandlers.get(type),
      registries.builtInTypeHandlers.get(type),
    ].filter(Boolean) as FieldHandler[];
  };

  /**
   * Walks the handler chain, stopping at the first one that doesn't return `false`.
   * Returns true if any handler claimed the change; false otherwise.
   */
  const runHandlerChain = (
    handlers: FieldHandler[],
    value: unknown,
    element: Element,
    meta: { path: string; type: string }
  ): boolean => {
    for (let i = 0; i < handlers.length; i += 1) {
      const result = handlers[i](value, element, meta);
      if (result !== false) return true;
    }
    return false;
  };

  if (!shouldRun) {
    return {
      INTERNAL_EVENTS,
      helpers: {
        getMimePrefix,
        findMediaTarget,
        patchMediaElement,
        resolveMediaUrl,
        BUILT_IN_MEDIA_HANDLER,
        resolveHandlerChain,
        runHandlerChain,
      },
    };
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

  const getElementsByPath = (path: string) => {
    return document.querySelectorAll(`[${SOURCE_ATTRIBUTE}*="path=${path}"]`);
  };

  /* -----------------------------------------------------------------------------------------------
   * Public API setup (window.strapiPreview)
   *
   * Registries live on `window` so user-registered handlers survive preview-script re-injection
   * (e.g. when the admin navigates between entries).
   * ---------------------------------------------------------------------------------------------*/

  const registries = window.__strapiPreviewRegistries ?? {
    fieldHandlers: new Map<string, FieldHandler>(),
    typeHandlers: new Map<string, FieldHandler>(),
  };
  window.__strapiPreviewRegistries = registries;

  // Built-in defaults are always re-bound from code (they come from this script's closure).
  const builtInTypeHandlers = new Map<string, FieldHandler>([['media', BUILT_IN_MEDIA_HANDLER]]);

  window.strapiPreview = {
    version: 1,
    onType: (type, handler) => {
      registries.typeHandlers.set(type, handler);
    },
    onField: (path, handler) => {
      registries.fieldHandlers.set(path, handler);
    },
    off: (key) => {
      registries.fieldHandlers.delete(key);
      registries.typeHandlers.delete(key);
    },
  };

  const signalUnhandled = (field: string, type: string) => {
    sendMessage(INTERNAL_EVENTS.STRAPI_FIELD_REPLACE_UNHANDLED, { field, type });
  };

  const dispatchScopedRefresh = (
    field: string,
    value: unknown,
    type: string,
    elements: NodeListOf<Element>
  ) => {
    const handlers = resolveHandlerChain(field, type, {
      ...registries,
      builtInTypeHandlers,
    });
    if (handlers.length === 0 || elements.length === 0) {
      signalUnhandled(field, type);
      return;
    }
    const meta = { path: field, type };
    let anyHandled = false;
    elements.forEach((element) => {
      if (runHandlerChain(handlers, value, element, meta)) {
        anyHandled = true;
      }
    });
    if (!anyHandled) {
      signalUnhandled(field, type);
    }
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
          // TODO: check if we can call split instead of decode+clean
          const result = stegaDecode(directTextContent);
          if (result && 'strapiSource' in result) {
            element.setAttribute(SOURCE_ATTRIBUTE, result.strapiSource);

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

  const createHighlightStyles = () => {
    const existingStyles = document.getElementById(HIGHLIGHT_STYLES_ID);
    // Remove existing styles to avoid duplicates
    if (existingStyles) {
      existingStyles.remove();
    }

    const styleElement = document.createElement('style');
    styleElement.id = HIGHLIGHT_STYLES_ID;
    styleElement.textContent = `
      .strapi-highlight {
        position: absolute;
        outline: 2px solid transparent;
        pointer-events: auto;
        border-radius: 2px;
        background-color: transparent;
        will-change: transform;
        transition: outline-color 0.1s ease-in-out;
      }

      .strapi-highlight:hover {
        outline-color: ${HIGHLIGHT_HOVER_COLOR} !important;
      }

      .strapi-highlight.strapi-highlight-focused {
        outline-color: ${HIGHLIGHT_ACTIVE_COLOR} !important;
        outline-width: 3px !important;
      }
    `;

    document.head.appendChild(styleElement);
    return styleElement;
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
    const pendingClicks = new Map<Element, number>(); // number is timeout id
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
      highlight.className = 'strapi-highlight';
      const clickHandler = (event: MouseEvent) => {
        // Skip if this is a re-dispatched event from our delayed handler to avoid infinite loops
        if ((event as any).__strapi_redispatched) {
          return;
        }

        // Prevent the immediate action for interactive elements
        event.preventDefault();
        event.stopPropagation();

        // Clear any existing timeout for this element
        const existingTimeout = pendingClicks.get(element);
        if (existingTimeout) {
          window.clearTimeout(existingTimeout);
          pendingClicks.delete(element);
        }

        // Set up a delayed single-click handler
        const timeout = window.setTimeout(() => {
          pendingClicks.delete(element);

          // Send single-click hint notification
          sendMessage(INTERNAL_EVENTS.STRAPI_FIELD_SINGLE_CLICK_HINT, null);

          // Re-trigger the click on the underlying element after the double-click timeout
          // Create a new event to dispatch with a marker to prevent re-handling
          const newEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
            detail: 1,
            button: event.button,
            buttons: event.buttons,
            clientX: event.clientX,
            clientY: event.clientY,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey,
          });
          (newEvent as any).__strapi_redispatched = true;
          element.dispatchEvent(newEvent);
        }, DOUBLE_CLICK_TIMEOUT);

        pendingClicks.set(element, timeout);
      };

      const doubleClickHandler = (event: MouseEvent) => {
        // Prevent the default behavior on double-click
        event.preventDefault();
        event.stopPropagation();

        // Clear any pending single-click action
        const existingTimeout = pendingClicks.get(element);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          pendingClicks.delete(element);
        }

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

      highlight.addEventListener('click', clickHandler);
      highlight.addEventListener('dblclick', doubleClickHandler);
      highlight.addEventListener('mousedown', mouseDownHandler);

      // Store event listeners for cleanup
      eventListeners.push(
        { element: highlight, type: 'click', handler: clickHandler as EventListener },
        { element: highlight, type: 'dblclick', handler: doubleClickHandler as EventListener },
        { element: highlight, type: 'mousedown', handler: mouseDownHandler as EventListener }
      );

      elementsToHighlight.set(element, highlight);
      overlay.appendChild(highlight);
      drawHighlight(element, highlight);
    };

    const removeHighlightForElement = (element: Element) => {
      const highlight = elementsToHighlight.get(element);

      if (!highlight) return;

      // Clear any pending click timeout for this element
      const pendingTimeout = pendingClicks.get(element);
      if (pendingTimeout) {
        window.clearTimeout(pendingTimeout);
        pendingClicks.delete(element);
      }

      highlight.remove();
      elementsToHighlight.delete(element);

      // Remove event listeners for this highlight
      const listenersToRemove = eventListeners.filter((listener) => listener.element === highlight);
      listenersToRemove.forEach(({ element, type, handler }) => {
        element.removeEventListener(type, handler);
      });

      // Mutate eventListeners to remove listeners for this highlight
      eventListeners.splice(
        0,
        eventListeners.length,
        ...eventListeners.filter((listener) => listener.element !== highlight)
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
      clearAllPendingClicks: () => {
        pendingClicks.forEach((timeout) => clearTimeout(timeout));
        pendingClicks.clear();
      },
    };
  };

  type HighlightManager = ReturnType<typeof createHighlightManager>;

  /**
   * We need to track scroll in all the element parents in order to keep the highlight position
   * in sync with the element position. Listening to window scroll is not enough because the
   * element can be inside one or more scrollable containers.
   */
  const setupScrollManagement = (highlightManager: HighlightManager) => {
    const updateOnScroll = () => {
      highlightManager.updateAllHighlights();
    };

    const scrollableElements = new Set<Element | Window>();
    scrollableElements.add(window);

    // Find all scrollable ancestors for all tracked elements and set up scroll listeners
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

    const cleanup = () => {
      scrollableElements.forEach((element) => {
        if (element === window) {
          window.removeEventListener('scroll', updateOnScroll);
          window.removeEventListener('resize', updateOnScroll);
        } else {
          (element as Element).removeEventListener('scroll', updateOnScroll);
        }
      });
    };

    return { cleanup };
  };

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

    return {
      resizeObserver,
      highlightObserver,
      stegaObserver,
    };
  };

  const setupEventHandlers = (highlightManager: HighlightManager) => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data?.type) return;

      // The user typed in an input, reflect the change in the preview
      if (event.data.type === INTERNAL_EVENTS.STRAPI_FIELD_CHANGE) {
        const { field, value, type } = event.data.payload as {
          field?: string;
          value?: unknown;
          type?: string;
        };
        if (!field) return;

        const elements = getElementsByPath(field);

        // If any handler (user-registered or built-in) applies to this (field, type), route
        // through the scoped-refresh dispatcher. This covers media today; future phases will
        // add built-ins for blocks.
        const hasHandler =
          !!type &&
          (registries.fieldHandlers.has(field) ||
            registries.typeHandlers.has(type) ||
            builtInTypeHandlers.has(type));

        if (hasHandler) {
          dispatchScopedRefresh(field, value, type!, elements);
          highlightManager.updateAllHighlights();
          return;
        }

        // Default: string-like fields (text, richtext, etc.) patch textContent.
        elements.forEach((element) => {
          if (element instanceof HTMLElement) {
            element.textContent = (value as string) || '';
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
          highlight.classList.remove('strapi-highlight-focused');
        });
        highlightManager.focusedHighlights.length = 0;

        // Set new focused field and highlight matching elements
        highlightManager.setFocusedField(field);
        getElementsByPath(field).forEach((element, index) => {
          if (index === 0) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          const highlight =
            highlightManager.highlights[Array.from(highlightManager.elements).indexOf(element)];
          if (highlight) {
            highlight.classList.add('strapi-highlight-focused');
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
          highlight.classList.remove('strapi-highlight-focused');
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
    scrollManager: ReturnType<typeof setupScrollManagement>,
    eventHandlers: EventListenersList,
    highlightManager: HighlightManager
  ) => {
    window.__strapi_previewCleanup = () => {
      observers.resizeObserver.disconnect();
      observers.highlightObserver.disconnect();
      observers.stegaObserver?.disconnect();

      // Clean up scroll listeners
      scrollManager.cleanup();

      // Clear all pending click timeouts
      highlightManager.clearAllPendingClicks();

      // Remove highlight event listeners
      eventHandlers.forEach(({ element, type, handler }) => {
        element.removeEventListener(type, handler);
      });

      // Clean up CSS styles
      const existingStyles = document.getElementById(HIGHLIGHT_STYLES_ID);
      if (existingStyles) {
        existingStyles.remove();
      }

      overlay.remove();
    };
  };

  /* -----------------------------------------------------------------------------------------------
   * Orchestration
   * ---------------------------------------------------------------------------------------------*/

  setupStegaDOMObserver().then((stegaObserver) => {
    createHighlightStyles();
    const overlay = createOverlaySystem();
    const highlightManager = createHighlightManager(overlay);
    const observers = setupObservers(highlightManager, stegaObserver);
    const scrollManager = setupScrollManagement(highlightManager);
    const eventHandlers = setupEventHandlers(highlightManager);
    createCleanupSystem(overlay, observers, scrollManager, eventHandlers, highlightManager);
  });
};

export { previewScript };
