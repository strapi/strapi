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
    /**
     * We intentionally use "*" here because the preview iframe (user site) and Strapi admin (parent)
     * are frequently on different origins. Target origin validation should happen on the receiver side.
     */
    window.parent.postMessage({ type, payload }, '*');
  };

  const getElementsByPath = (
    path: string,
    options: {
      includeDescendants?: boolean;
      includeFieldPath?: boolean;
    } = {}
  ) => {
    const { includeDescendants = false, includeFieldPath = false } = options;
    const nodes = document.querySelectorAll(`[${SOURCE_ATTRIBUTE}]`);

    return Array.from(nodes).filter((node) => {
      const attr = node.getAttribute(SOURCE_ATTRIBUTE);
      const params = new URLSearchParams(attr ?? '');
      const sourcePath = params.get('path');
      const fieldPath = params.get('fieldPath');

      if (sourcePath === path) {
        return true;
      }

      if (includeFieldPath && fieldPath === path) {
        return true;
      }

      return includeDescendants && !!sourcePath && sourcePath.startsWith(`${path}.`);
    });
  };

  const isMediaElement = (element: Element): boolean => {
    return element.tagName === 'IMG' || element.tagName === 'VIDEO';
  };

  const normalizeMediaFieldPath = (
    sourcePath: string,
    options: { stripLeafProperty?: boolean } = {}
  ) => {
    const { stripLeafProperty = false } = options;
    const pathSegments = sourcePath.split('.').filter(Boolean);

    if (pathSegments.length === 0) {
      return sourcePath;
    }

    // For non-media text nodes from upload files (e.g. alt/caption), drop the property segment first.
    if (stripLeafProperty) {
      pathSegments.pop();
    }

    // Stega on media URLs may still point to "...url". Always normalize to the media field path.
    if (pathSegments[pathSegments.length - 1] === 'url') {
      pathSegments.pop();
    }

    // Repeatable media fields resolve to "<field>.<index>": normalize to "<field>" for InputRenderer.
    const lastSegment = pathSegments[pathSegments.length - 1];
    if (lastSegment && /^\d+$/.test(lastSegment)) {
      pathSegments.pop();
    }

    return pathSegments.join('.');
  };

  /**
   * Get the field path to use for focusing a field from a stega source.
   * - Prefer explicit fieldPath when available (e.g. blocks nested text nodes)
   * - For blocks without fieldPath, derive the root blocks field from "X.<index>.children..."
   * - For media-derived upload fields (url, caption, alt), normalize to the parent media field path.
   */
  const getFieldPathForMedia = (sourceAttr: string, element: Element): string => {
    const params = new URLSearchParams(sourceAttr);
    const fieldPath = params.get('fieldPath');

    // For nested stega paths (e.g. blocks text nodes), focus the parent field.
    if (fieldPath) {
      params.set('path', fieldPath);
      params.delete('fieldPath');
      return params.toString();
    }

    const type = params.get('type');
    const sourcePath = params.get('path');

    if (type === 'blocks' && sourcePath) {
      const blocksPathMatch = sourcePath.match(/^(.*?)\.\d+\.children\./);
      if (blocksPathMatch?.[1]) {
        params.set('path', blocksPathMatch[1]);
        return params.toString();
      }
    }

    if (params.get('model') === 'plugin::upload.file' && sourcePath) {
      const normalizedPath = normalizeMediaFieldPath(sourcePath, {
        stripLeafProperty: !isMediaElement(element),
      });

      if (normalizedPath) {
        params.set('path', normalizedPath);
      }

      return params.toString();
    }

    return sourceAttr;
  };

  const getInteractiveClickTarget = (element: HTMLElement): HTMLElement => {
    if (!isMediaElement(element)) {
      return element;
    }

    let parent = element.parentElement;
    while (parent) {
      if (
        parent.tagName === 'A' ||
        parent.tagName === 'BUTTON' ||
        parent.hasAttribute('onclick') ||
        parent.getAttribute('role') === 'button' ||
        parent.getAttribute('role') === 'link'
      ) {
        return parent;
      }

      parent = parent.parentElement;
    }

    return element;
  };

  const getRenderableTextValue = (value: unknown): string | null => {
    if (value === null || value === undefined) {
      return 'null';
    }

    if (typeof value === 'string') {
      return value === '' ? 'null' : value;
    }

    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
      return String(value);
    }

    // Complex values should be rendered by the frontend app itself.
    return null;
  };

  const isBlocksValue = (value: unknown): boolean => {
    if (!Array.isArray(value)) {
      return false;
    }

    return value.every(
      (item) =>
        item !== null &&
        typeof item === 'object' &&
        'type' in item &&
        'children' in item &&
        Array.isArray((item as { children?: unknown[] }).children)
    );
  };

  const getBlocksTextUpdates = (
    blocks: unknown,
    rootPath: string
  ): Array<{ path: string; text: string }> => {
    const updates: Array<{ path: string; text: string }> = [];

    const visitNode = (node: unknown, currentPath: string) => {
      if (Array.isArray(node)) {
        node.forEach((child, index) => {
          visitNode(child, `${currentPath}.${index}`);
        });
        return;
      }

      if (!node || typeof node !== 'object') {
        return;
      }

      if ('text' in node && typeof node.text === 'string') {
        updates.push({ path: `${currentPath}.text`, text: node.text });
      }

      if ('children' in node && Array.isArray(node.children)) {
        node.children.forEach((child, index) => {
          visitNode(child, `${currentPath}.children.${index}`);
        });
      }
    };

    visitNode(blocks, rootPath);
    return updates;
  };

  const isMediaLikeValue = (value: unknown): value is { url?: unknown; mime?: unknown } => {
    return value !== null && typeof value === 'object' && 'url' in value;
  };

  const getSourcePathFromElement = (element: Element): string | null => {
    const sourceAttr = element.getAttribute(SOURCE_ATTRIBUTE);
    if (!sourceAttr) {
      return null;
    }

    return new URLSearchParams(sourceAttr).get('path');
  };

  const getMediaValueForSourcePath = (
    field: string,
    value: unknown,
    sourcePath: string | null
  ): unknown => {
    if (!sourcePath) {
      return null;
    }

    if (Array.isArray(value)) {
      if (!sourcePath.startsWith(`${field}.`)) {
        return null;
      }

      const relativePath = sourcePath.slice(field.length + 1);
      const mediaIndex = Number(relativePath.split('.')[0]);
      if (Number.isNaN(mediaIndex)) {
        return null;
      }

      return value[mediaIndex] ?? null;
    }

    if (isMediaLikeValue(value) && sourcePath === field) {
      return value;
    }

    return null;
  };

  const updateMediaElement = (
    element: HTMLElement,
    value: unknown,
    siblingElements: HTMLElement[]
  ) => {
    const url = typeof value === 'string' ? value : isMediaLikeValue(value) ? value.url : undefined;
    const mime = isMediaLikeValue(value) ? value.mime : undefined;
    const normalizedUrl = typeof url === 'string' ? url : '';
    const normalizedMime = typeof mime === 'string' ? mime : undefined;

    if (!normalizedUrl) {
      if (normalizedMime === 'application/x-strapi-empty-media') {
        // Render a 1x1 transparent GIF as placeholder so it remains selectable
        element.setAttribute(
          'src',
          'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        );
        element.style.display = '';
        element.style.minWidth = '24px'; // Ensure it has some dimensions
        element.style.minHeight = '24px';
        element.style.backgroundColor = '#f0f0f0'; // Slight background to be visible
        element.style.border = '1px dashed #ccc';
      } else {
        element.style.display = 'none';
        element.removeAttribute('src');
      }
      return;
    }

    const isImageElement = element.tagName === 'IMG';
    const isVideoElement = element.tagName === 'VIDEO';
    const isImageMime = normalizedMime?.startsWith('image/');
    const isVideoMime = normalizedMime?.startsWith('video/');
    const isCompatible =
      !normalizedMime ||
      (isImageElement && !!isImageMime) ||
      (isVideoElement && !!isVideoMime) ||
      (!isImageMime && !isVideoMime);

    const hasCompatibleSibling =
      (isImageMime &&
        siblingElements.some((sibling) => sibling !== element && sibling.tagName === 'IMG')) ||
      (isVideoMime &&
        siblingElements.some((sibling) => sibling !== element && sibling.tagName === 'VIDEO'));

    if (!isCompatible && hasCompatibleSibling) {
      element.style.display = 'none';
      element.removeAttribute('src');
      return;
    }

    // Avoid replacing nodes in-place (React-managed trees may crash on save after external replaceChild).
    element.setAttribute('src', normalizedUrl);
    element.style.display = '';

    // Reset placeholder styles if present
    element.style.minWidth = '';
    element.style.minHeight = '';
    element.style.backgroundColor = '';
    element.style.border = '';

    if (isVideoElement) {
      element.setAttribute('controls', '');
    }
  };

  /* -----------------------------------------------------------------------------------------------
   * Functionality pieces
   * ---------------------------------------------------------------------------------------------*/

  const setupStegaDOMObserver = async () => {
    if (DISABLE_STEGA_DECODING) {
      return;
    }

    const {
      vercelStegaDecode: stegaDecode,
      vercelStegaDecodeAll: stegaDecodeAll,
      vercelStegaClean: stegaClean,
    } = await import(
      // @ts-expect-error it's not a local dependency
      // eslint-disable-next-line import/no-unresolved
      'https://cdn.jsdelivr.net/npm/@vercel/stega@0.1.2/+esm'
    );

    const applyStegaToElement = (element: Element) => {
      // Handle img and video tags - check src attribute for stega encoding
      if (isMediaElement(element)) {
        const src = element.getAttribute('src');
        if (src) {
          try {
            const result = stegaDecode(src);
            if (result && 'strapiSource' in result) {
              // Parse the source and remove .url suffix to point to the media field
              const sourceValue = result.strapiSource as string;
              const pathMatch = sourceValue.match(/path=([^&]+)/);
              if (pathMatch) {
                const originalPath = pathMatch[1];
                // Remove .url to get the media field path
                const mediaPath = originalPath.replace(/\.url$/, '');
                const newSource = sourceValue.replace(`path=${originalPath}`, `path=${mediaPath}`);
                element.setAttribute(SOURCE_ATTRIBUTE, newSource);
              }
            }
            // Clean the src attribute so the resource can load
            const cleanedSrc = stegaClean(src);
            if (cleanedSrc !== src) {
              element.setAttribute('src', cleanedSrc);
            }
          } catch {
            // noop – invalid stega payload / decode failure
          }
        }
        return;
      }

      const directTextNodes = Array.from(element.childNodes).filter(
        (node): node is Text => node.nodeType === Node.TEXT_NODE
      );

      if (directTextNodes.length === 0) {
        return;
      }

      let decodedSource: string | null = null;

      // Decode each direct text node independently so split rich text leaves are handled.
      directTextNodes.forEach((node) => {
        if (!node.textContent) {
          return;
        }

        try {
          const decodedSources = stegaDecodeAll(node.textContent) as Array<{
            strapiSource?: string;
          }>;
          const firstSource = decodedSources.find((decoded) => decoded?.strapiSource)?.strapiSource;
          if (!decodedSource && firstSource) {
            decodedSource = firstSource;
          }

          const cleanedText = stegaClean(node.textContent);
          if (cleanedText !== node.textContent) {
            node.textContent = cleanedText;
          }
        } catch {
          // noop – invalid stega payload / decode failure
        }
      });

      if (decodedSource) {
        element.setAttribute(SOURCE_ATTRIBUTE, decodedSource);
        return;
      }

      // Fallback to merged direct text content for edge cases where encoded chars are split across nodes.
      const directTextContent = directTextNodes.map((node) => node.textContent || '').join('');

      if (!directTextContent) {
        return;
      }

      try {
        const decodedSources = stegaDecodeAll(directTextContent) as Array<{
          strapiSource?: string;
        }>;
        const firstSource = decodedSources.find((decoded) => decoded?.strapiSource)?.strapiSource;
        if (firstSource) {
          element.setAttribute(SOURCE_ATTRIBUTE, firstSource);
        }
      } catch {
        // noop – invalid stega payload / decode failure
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
        // Handle src attribute changes for img/video elements
        if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
          const target = mutation.target as Element;
          if (isMediaElement(target)) {
            applyStegaToElement(target);
          }
        }
      });
    });

    observer.observe(document, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['src'],
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
    type: keyof HTMLElementEventMap | keyof WindowEventMap | 'message';
    handler: EventListener;
  }>;

  const createHighlightManager = (overlay: HTMLElement) => {
    const elementsToHighlight = new Map<Element, HTMLElement>();
    const eventListeners: EventListenersList = [];
    const focusedHighlights: HTMLElement[] = [];
    const pendingClicks = new Map<Element, number>(); // number is timeout id
    const clonedElements: HTMLElement[] = []; // Track cloned elements to remove on cleanup
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

          const targetElement = getInteractiveClickTarget(element);

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (newEvent as any).__strapi_redispatched = true;
          targetElement.dispatchEvent(newEvent);
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
          const path = getFieldPathForMedia(sourceAttribute, element);
          const rect = element.getBoundingClientRect();
          sendMessage(INTERNAL_EVENTS.STRAPI_FIELD_FOCUS_INTENT, {
            path,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        element.removeEventListener(type as any, handler);
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
      registerClonedElement: (element: HTMLElement) => {
        clonedElements.push(element);
      },
      clonedElements,
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
        const { field, value } = event.data.payload;
        if (!field) return;

        if (isBlocksValue(value)) {
          getBlocksTextUpdates(value, field).forEach(({ path, text }) => {
            const elements = getElementsByPath(path);

            if (elements.length > 0) {
              elements.forEach((element) => {
                if (element instanceof HTMLElement && !isMediaElement(element)) {
                  element.innerText = text;
                }
              });
              return;
            }

            // If the element doesn't exist (e.g. new block added), try to find a preceding sibling to clone
            // We assume paths like "field.0.children.0.text" and try to find "field.0.children.-1.text" (conceptually)
            // We look for all numeric segments in the path and try decrementing them from right to left.
            const segments = path.split('.');
            const numericIndices = segments
              .map((s, i) => (/^\d+$/.test(s) ? i : -1))
              .filter((i) => i !== -1);

            // Iterate from right to left (deepest to shallowest)
            for (let i = numericIndices.length - 1; i >= 0; i--) {
              const segmentIndex = numericIndices[i];
              const currentIndex = parseInt(segments[segmentIndex], 10);

              if (currentIndex > 0) {
                const previousIndex = currentIndex - 1;
                const candidateSegments = [...segments];
                candidateSegments[segmentIndex] = previousIndex.toString();
                const candidatePath = candidateSegments.join('.');

                const previousElements = getElementsByPath(candidatePath);

                if (previousElements.length > 0) {
                  previousElements.forEach((prevEl) => {
                    if (prevEl instanceof HTMLElement && prevEl.parentElement) {
                      // Clone strategy
                      const clone = prevEl.cloneNode(true) as HTMLElement;

                      // Update source attribute
                      const oldSource = prevEl.getAttribute(SOURCE_ATTRIBUTE);
                      if (oldSource) {
                        const newSource = oldSource.replace(
                          `path=${candidatePath}`,
                          `path=${path}`
                        );
                        clone.setAttribute(SOURCE_ATTRIBUTE, newSource);
                      }

                      clone.innerText = text;
                      prevEl.parentElement.insertBefore(clone, prevEl.nextSibling);

                      // Track the cloned element for cleanup
                      highlightManager.registerClonedElement(clone);
                    }
                  });
                  // If we found a match at this level, we stop searching.
                  return;
                }
              }
            }
          });

          highlightManager.updateAllHighlights();
          return;
        }

        getElementsByPath(field).forEach((element) => {
          if (element instanceof HTMLElement) {
            if (!isMediaElement(element)) {
              const nextText = getRenderableTextValue(value);
              if (nextText !== null) {
                element.textContent = nextText;
              }
            }
          }
        });

        const mediaElements = getElementsByPath(field, { includeDescendants: true }).filter(
          (element): element is HTMLElement =>
            element instanceof HTMLElement && isMediaElement(element)
        );

        const mediaElementsByPath = new Map<string, HTMLElement[]>();
        mediaElements.forEach((element) => {
          const sourcePath = getSourcePathFromElement(element);
          if (!sourcePath) {
            return;
          }

          const currentElements = mediaElementsByPath.get(sourcePath) ?? [];
          currentElements.push(element);
          mediaElementsByPath.set(sourcePath, currentElements);
        });

        mediaElements.forEach((element) => {
          const sourcePath = getSourcePathFromElement(element);
          const mediaValue = getMediaValueForSourcePath(field, value, sourcePath);
          const siblingElements = sourcePath
            ? (mediaElementsByPath.get(sourcePath) ?? [element])
            : [element];
          updateMediaElement(element, mediaValue, siblingElements);
        });

        // Handle nested media asset fields (caption, alt, etc.)
        if (typeof value === 'object' && value !== null) {
          const allSourceElements = document.querySelectorAll(`[${SOURCE_ATTRIBUTE}]`);

          allSourceElements.forEach((element) => {
            const sourceAttr = element.getAttribute(SOURCE_ATTRIBUTE);
            if (!sourceAttr) return;

            const params = new URLSearchParams(sourceAttr);
            const model = params.get('model');
            const elementPath = params.get('path');

            if (
              model !== 'plugin::upload.file' ||
              !elementPath ||
              !(element instanceof HTMLElement)
            ) {
              return;
            }

            if (Array.isArray(value)) {
              if (!elementPath.startsWith(`${field}.`) || isMediaElement(element)) return;

              const relativePath = elementPath.slice(field.length + 1);
              const [indexPart, ...propertyPath] = relativePath.split('.');
              const mediaIndex = Number(indexPart);

              if (Number.isNaN(mediaIndex) || propertyPath.length === 0) return;

              const mediaItem = value[mediaIndex];
              if (!mediaItem || typeof mediaItem !== 'object') return;

              const propertyName = propertyPath.join('.');
              const propertyValue = (mediaItem as Record<string, unknown>)[propertyName];
              if (propertyValue !== undefined) {
                element.textContent = propertyValue ? String(propertyValue) : '';
              }
              return;
            }

            if (elementPath.startsWith(`${field}.`)) {
              const propertyName = elementPath.slice(field.length + 1);
              const propertyValue = (value as Record<string, unknown>)[propertyName];
              if (!isMediaElement(element) && propertyValue !== undefined) {
                element.textContent = propertyValue ? String(propertyValue) : '';
              }
            }
          });
        }

        // Update highlight dimensions since the new content may affect them
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
        const exactMatches = getElementsByPath(field);
        const matchingElements =
          exactMatches.length > 0
            ? exactMatches
            : getElementsByPath(field, { includeDescendants: true, includeFieldPath: true });

        matchingElements.forEach((element, index) => {
          if (index === 0) {
            // Check if scrollIntoViewIfNeeded is available (e.g. Chrome)
            if (
              'scrollIntoViewIfNeeded' in element &&
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              typeof (element as any).scrollIntoViewIfNeeded === 'function'
            ) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (element as any).scrollIntoViewIfNeeded({ behavior: 'smooth', block: 'center' });
            } else {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
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
      type: 'message' as const,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (element as any).removeEventListener(type, handler);
      });

      // Tracked cloned elements removal to prevent React reconciliation errors
      highlightManager.clonedElements.forEach((element) => {
        element.remove();
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
