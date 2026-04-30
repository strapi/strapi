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
    window.parent.postMessage({ type, payload }, '*');
  };

  const getElementsByPath = (path: string) => {
    return document.querySelectorAll(`[${SOURCE_ATTRIBUTE}*="path=${path}"]`);
  };

  const isMediaElement = (element: Element): boolean => {
    return element.tagName === 'IMG' || element.tagName === 'VIDEO' || element.tagName === 'AUDIO';
  };

  /**
   * When a media field's mime type changes (e.g. image -> video), we can't
   * swap the rendered DOM tag in place — the host framework (e.g. React)
   * owns the original element and throws on removeChild if we replaceChild
   * it. Instead we leave the original where it is, hide it, and insert our
   * own sibling element of the correct tag. The injection lives outside the
   * host framework's virtual DOM, so reconciliation never touches it.
   *
   * On save the host framework re-renders with the saved data and unmounts
   * the original, leaving our injection orphaned next to its replacement —
   * which is what was producing duplicate previews. The childList observer
   * below uses these maps to drop the injection whenever its associated
   * original is removed.
   */
  const originalToInjection = new Map<HTMLElement, HTMLElement>();
  const injectionToOriginal = new Map<HTMLElement, HTMLElement>();

  const trackInjection = (original: HTMLElement, injection: HTMLElement) => {
    originalToInjection.set(original, injection);
    injectionToOriginal.set(injection, original);
  };

  const untrackInjection = (injection: HTMLElement) => {
    const original = injectionToOriginal.get(injection);
    if (original) originalToInjection.delete(original);
    injectionToOriginal.delete(injection);
  };

  /**
   * When a media field is cleared, the original media element gets hidden and
   * has no bounding box, so the highlight system stops drawing a clickable
   * area for it. That leaves the user no way to re-add media from the preview.
   * We insert a sized placeholder div carrying the original's source attribute
   * so the highlight system keeps tracking the spot. The placeholder is
   * tracked in the same injection maps as a real injection, so the next
   * `setMediaElement` call (when the user picks new media) tears it down and
   * restores/replaces the original element via the existing flow.
   */
  const PLACEHOLDER_ATTRIBUTE = 'data-strapi-media-placeholder';
  /**
   * When the host framework unmounts a placeholder's tracked original
   * (typically after a save commits a null value), the placeholder is
   * promoted to standalone — kept in the DOM but no longer paired. We stash
   * the original's last src on it so future relative URLs from the form
   * still resolve against the right backend origin.
   */
  const PLACEHOLDER_ORIGIN_ATTRIBUTE = 'data-strapi-media-origin';
  const createMediaPlaceholder = (sourceAttr: string, rect: DOMRect): HTMLElement => {
    const placeholder = document.createElement('div');
    placeholder.setAttribute(PLACEHOLDER_ATTRIBUTE, '');
    placeholder.setAttribute(SOURCE_ATTRIBUTE, sourceAttr);

    const width = rect.width > 0 ? rect.width : 200;
    const height = rect.height > 0 ? rect.height : 200;
    placeholder.style.cssText = `
      display: inline-block;
      width: ${width}px;
      height: ${height}px;
      background-color: rgba(0, 0, 0, 0.04);
      border: 2px dashed rgba(0, 0, 0, 0.15);
      border-radius: 4px;
      box-sizing: border-box;
      vertical-align: top;
    `;
    return placeholder;
  };

  /**
   * Form values for media fields carry the raw Strapi URL (often relative,
   * e.g. "/uploads/foo.jpg"). The host framework typically renders the
   * original element with an absolute URL (resolved against the Strapi
   * backend, not the iframe origin). If we naively set the relative form
   * value as src, the browser resolves it against the iframe origin and
   * fails to load. Resolve against the original element's existing src
   * origin so the swap targets the same backend.
   */
  const resolveMediaUrl = (originalEl: HTMLElement, rawUrl: string): string => {
    if (/^(?:[a-z]+:)?\/\//i.test(rawUrl) || rawUrl.startsWith('data:')) {
      return rawUrl;
    }
    // Placeholders carry the origin in a data attribute (no real src),
    // because they survive past the original element's unmount.
    const currentSrc =
      originalEl.getAttribute('src') ?? originalEl.getAttribute(PLACEHOLDER_ORIGIN_ATTRIBUTE);
    if (!currentSrc) return rawUrl;
    try {
      const currentUrl = new URL(currentSrc, window.location.href);
      return new URL(rawUrl, currentUrl.origin).href;
    } catch {
      return rawUrl;
    }
  };

  /**
   * Extract a recognizable media filename from a URL string. Works for
   * direct backend URLs, relative paths, and proxy URLs that embed the
   * real path in a query parameter (e.g. Next.js's "/_next/image?url=...").
   * Used to detect whether the rendered element already shows the same
   * asset as the form value, so we can skip src updates that would only
   * substitute one URL representation for another.
   */
  const getMediaFilename = (raw: string): string => {
    if (!raw) return '';
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {}
    const match = decoded.match(
      /([^/?#&=\s]+\.(?:jpg|jpeg|png|gif|webp|avif|svg|mp4|mov|webm|ogg|m4v|mp3|wav|m4a|aac|flac|opus))(?:[?#&]|$)/i
    );
    return match ? match[1].toLowerCase() : '';
  };

  /**
   * Get the field path to use for focusing a media field.
   * - For IMG/VIDEO elements: the path was already normalized (stripped of .url) during stega decoding
   * - For tracked injections (e.g., placeholder divs we insert when media is cleared): the source
   *   attribute was copied from the post-normalization media element, so it's already correct
   * - For non-media elements with model=plugin::upload.file (e.g., caption text): strip the last
   *   segment to focus the parent media field (e.g., "hero.caption" -> "hero")
   */
  const getFieldPathForMedia = (sourceAttr: string, element: Element): string => {
    if (isMediaElement(element) || injectionToOriginal.has(element as HTMLElement)) {
      return sourceAttr;
    }

    // For non-media elements, check if it's a media asset field
    const params = new URLSearchParams(sourceAttr);
    if (params.get('model') === 'plugin::upload.file') {
      const elementPath = params.get('path');
      if (elementPath) {
        // Strip the last segment (e.g., "hero.caption" -> "hero")
        const parentPath = elementPath.split('.').slice(0, -1).join('.');
        params.set('path', parentPath);
        return params.toString();
      }
    }

    return sourceAttr;
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
          } catch (error) {}
        }
        return;
      }

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
    type: keyof HTMLElementEventMap | 'message';
    handler: EventListener;
  }>;

  /**
   * Group all elements that share the exact same `data-strapi-source` value
   * under one highlight. This is what makes a multi-media field render as a
   * single bounding box in the preview (and what makes the popover open the
   * multi-media input rather than treating each item as its own field). The
   * grouping is keyed off the source string so other accidental same-source
   * renders (e.g. the title rendered twice) also collapse to one highlight,
   * which matches how the focused state already behaves.
   */
  type HighlightGroup = {
    highlight: HTMLElement;
    elements: Set<HTMLElement>;
  };

  const createHighlightManager = (overlay: HTMLElement) => {
    const groups = new Map<string, HighlightGroup>();
    const elementToGroupKey = new Map<HTMLElement, string>();
    const eventListeners: EventListenersList = [];
    const focusedHighlights: HTMLElement[] = [];
    const pendingClicks = new Map<HighlightGroup, number>();
    let focusedField: string | null = null;

    const computeGroupRect = (group: HighlightGroup) => {
      let minLeft = Infinity;
      let minTop = Infinity;
      let maxRight = -Infinity;
      let maxBottom = -Infinity;
      let any = false;
      group.elements.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        any = true;
        if (r.left < minLeft) minLeft = r.left;
        if (r.top < minTop) minTop = r.top;
        if (r.right > maxRight) maxRight = r.right;
        if (r.bottom > maxBottom) maxBottom = r.bottom;
      });
      if (!any) return null;
      return {
        left: minLeft,
        top: minTop,
        width: maxRight - minLeft,
        height: maxBottom - minTop,
      };
    };

    const drawGroup = (group: HighlightGroup) => {
      const rect = computeGroupRect(group);
      if (!rect) {
        group.highlight.style.display = 'none';
        return;
      }
      group.highlight.style.display = '';
      group.highlight.style.width = `${rect.width + HIGHLIGHT_PADDING * 2}px`;
      group.highlight.style.height = `${rect.height + HIGHLIGHT_PADDING * 2}px`;
      group.highlight.style.transform = `translate(${rect.left - HIGHLIGHT_PADDING}px, ${rect.top - HIGHLIGHT_PADDING}px)`;
    };

    const updateAllHighlights = () => {
      groups.forEach(drawGroup);
    };

    /**
     * Pick the underlying source element under the pointer so single-click
     * redispatch hits the specific item the user clicked, even when the group
     * highlight covers several elements (multi-media gallery).
     */
    const pickElementAtPoint = (
      group: HighlightGroup,
      x: number,
      y: number
    ): HTMLElement | null => {
      for (const el of group.elements) {
        const r = el.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          return el;
        }
      }
      const first = group.elements.values().next().value;
      return first ?? null;
    };

    const createGroup = (groupKey: string): HighlightGroup => {
      const highlight = document.createElement('div');
      highlight.className = 'strapi-highlight';
      const group: HighlightGroup = { highlight, elements: new Set() };

      const clickHandler = (event: MouseEvent) => {
        if ((event as any).__strapi_redispatched) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        const existingTimeout = pendingClicks.get(group);
        if (existingTimeout) {
          window.clearTimeout(existingTimeout);
          pendingClicks.delete(group);
        }

        const timeout = window.setTimeout(() => {
          pendingClicks.delete(group);

          sendMessage(INTERNAL_EVENTS.STRAPI_FIELD_SINGLE_CLICK_HINT, null);

          // Pick the specific underlying element under the pointer so the
          // redispatched click targets the right item in a multi-element group
          const underlying = pickElementAtPoint(group, event.clientX, event.clientY);
          if (!underlying) return;

          let targetElement: HTMLElement = underlying;
          if (isMediaElement(underlying)) {
            let parent = underlying.parentElement;
            while (parent) {
              if (
                parent.tagName === 'A' ||
                parent.tagName === 'BUTTON' ||
                parent.hasAttribute('onclick') ||
                parent.getAttribute('role') === 'button' ||
                parent.getAttribute('role') === 'link'
              ) {
                targetElement = parent;
                break;
              }
              parent = parent.parentElement;
            }
          }

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
          targetElement.dispatchEvent(newEvent);
        }, DOUBLE_CLICK_TIMEOUT);

        pendingClicks.set(group, timeout);
      };

      const doubleClickHandler = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const existingTimeout = pendingClicks.get(group);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          pendingClicks.delete(group);
        }

        const anchor = pickElementAtPoint(group, event.clientX, event.clientY);
        if (!anchor) return;
        const sourceAttribute = anchor.getAttribute(SOURCE_ATTRIBUTE);
        if (!sourceAttribute) return;
        const path = getFieldPathForMedia(sourceAttribute, anchor);
        const rect = computeGroupRect(group);
        if (!rect) return;
        sendMessage(INTERNAL_EVENTS.STRAPI_FIELD_FOCUS_INTENT, {
          path,
          position: {
            top: rect.top,
            left: rect.left,
            right: rect.left + rect.width,
            bottom: rect.top + rect.height,
            width: rect.width,
            height: rect.height,
          },
        });
      };

      const mouseDownHandler = (event: MouseEvent) => {
        if (event.detail >= 2) {
          event.preventDefault();
        }
      };

      highlight.addEventListener('click', clickHandler);
      highlight.addEventListener('dblclick', doubleClickHandler);
      highlight.addEventListener('mousedown', mouseDownHandler);

      eventListeners.push(
        { element: highlight, type: 'click', handler: clickHandler as EventListener },
        { element: highlight, type: 'dblclick', handler: doubleClickHandler as EventListener },
        { element: highlight, type: 'mousedown', handler: mouseDownHandler as EventListener }
      );

      overlay.appendChild(highlight);
      groups.set(groupKey, group);
      return group;
    };

    const destroyGroup = (groupKey: string, group: HighlightGroup) => {
      const pendingTimeout = pendingClicks.get(group);
      if (pendingTimeout) {
        window.clearTimeout(pendingTimeout);
        pendingClicks.delete(group);
      }

      const focusedIndex = focusedHighlights.indexOf(group.highlight);
      if (focusedIndex !== -1) {
        focusedHighlights.splice(focusedIndex, 1);
      }

      group.highlight.remove();

      const listenersToRemove = eventListeners.filter(
        (listener) => listener.element === group.highlight
      );
      listenersToRemove.forEach(({ element, type, handler }) => {
        element.removeEventListener(type, handler);
      });
      eventListeners.splice(
        0,
        eventListeners.length,
        ...eventListeners.filter((listener) => listener.element !== group.highlight)
      );

      groups.delete(groupKey);
    };

    const createHighlightForElement = (element: HTMLElement) => {
      if (elementToGroupKey.has(element)) {
        return;
      }
      const groupKey = element.getAttribute(SOURCE_ATTRIBUTE);
      if (!groupKey) return;

      let group = groups.get(groupKey);

      // When a framework-rendered media element joins a group that still
      // holds stale ghosts from a previous clear (a standalone placeholder,
      // or our injection paired with a hidden placeholder), sweep the
      // ghosts so we don't end up with two visible elements stacked on top
      // of each other after a save commits a real value.
      if (group && isMediaElement(element) && !injectionToOriginal.has(element)) {
        const ghostInjections: HTMLElement[] = [];
        const ghostPlaceholders: HTMLElement[] = [];
        group.elements.forEach((el) => {
          if (injectionToOriginal.has(el)) {
            ghostInjections.push(el);
          } else if (el.hasAttribute(PLACEHOLDER_ATTRIBUTE)) {
            ghostPlaceholders.push(el);
          }
        });
        ghostInjections.forEach((injection) => {
          const orig = injectionToOriginal.get(injection);
          untrackInjection(injection);
          if (orig && orig.hasAttribute(PLACEHOLDER_ATTRIBUTE)) {
            orig.remove();
          }
          group?.elements.delete(injection);
          elementToGroupKey.delete(injection);
          injection.remove();
        });
        ghostPlaceholders.forEach((placeholder) => {
          group?.elements.delete(placeholder);
          elementToGroupKey.delete(placeholder);
          placeholder.remove();
        });
      }

      if (!group) {
        group = createGroup(groupKey);
      }
      group.elements.add(element);
      elementToGroupKey.set(element, groupKey);
      drawGroup(group);
    };

    const removeHighlightForElement = (element: Element) => {
      const groupKey = elementToGroupKey.get(element as HTMLElement);
      if (!groupKey) return;
      const group = groups.get(groupKey);
      if (!group) return;

      group.elements.delete(element as HTMLElement);
      elementToGroupKey.delete(element as HTMLElement);

      if (group.elements.size === 0) {
        destroyGroup(groupKey, group);
      } else {
        drawGroup(group);
      }
    };

    /**
     * Resolve groups whose elements match a focused field path. We delegate
     * to `getElementsByPath` so this preserves the same loose substring match
     * the highlight system has always used (e.g. focusing `hero` matches
     * `hero.caption` too).
     */
    const findGroupForPath = (path: string): HighlightGroup[] => {
      const matched = new Set<HighlightGroup>();
      getElementsByPath(path).forEach((el) => {
        const key = elementToGroupKey.get(el as HTMLElement);
        if (!key) return;
        const group = groups.get(key);
        if (group) matched.add(group);
      });
      return Array.from(matched);
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
        return Array.from(elementToGroupKey.keys());
      },
      get groups() {
        return Array.from(groups.values());
      },
      updateAllHighlights,
      eventListeners,
      focusedHighlights,
      createHighlightForElement,
      removeHighlightForElement,
      findGroupForPath,
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

              // If a tracked media original (or its ancestor) was removed —
              // typically when the host framework re-renders after save and
              // unmounts the previous element — drop our matching injection
              // so we don't end up with duplicate previews next to the new one.
              originalToInjection.forEach((injection, original) => {
                if (element === original || element.contains(original)) {
                  // Placeholders survive a framework unmount: that's the only
                  // anchor the user has to re-add media via the preview after
                  // saving a cleared field. Stash the original's last src on
                  // the placeholder so future relative URLs still resolve.
                  if (injection.hasAttribute(PLACEHOLDER_ATTRIBUTE)) {
                    const lastSrc = original.getAttribute('src');
                    if (lastSrc && !injection.hasAttribute(PLACEHOLDER_ORIGIN_ATTRIBUTE)) {
                      injection.setAttribute(PLACEHOLDER_ORIGIN_ATTRIBUTE, lastSrc);
                    }
                    untrackInjection(injection);
                  } else {
                    untrackInjection(injection);
                    injection.remove();
                  }
                } else if (element === injection || element.contains(injection)) {
                  // Our injection itself was removed (e.g. parent unmounted)
                  untrackInjection(injection);
                }
              });
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
    const setMediaElement = (el: HTMLElement, url: string | null, mime?: string) => {
      const original = injectionToOriginal.get(el) ?? el;
      const injection = originalToInjection.get(original) ?? null;

      const removeInjection = () => {
        if (!injection) return;
        // Move the source attribute back to the original so highlights track it again
        const sourceAttr = injection.getAttribute(SOURCE_ATTRIBUTE);
        if (sourceAttr) original.setAttribute(SOURCE_ATTRIBUTE, sourceAttr);
        untrackInjection(injection);
        injection.remove();
      };

      if (!url) {
        // Capture rect from whatever's currently visible before any DOM
        // changes, so the placeholder can be sized to match.
        const visibleEl = injection ?? original;
        const rect = visibleEl.getBoundingClientRect();

        // removeInjection moves the source attr back to original, so we read
        // it after.
        removeInjection();

        const sourceAttr = original.getAttribute(SOURCE_ATTRIBUTE);
        if (!sourceAttr) {
          original.style.display = 'none';
          return;
        }

        // If the "original" is itself a placeholder (a previous standalone
        // placeholder that's served as the original for an injected media
        // element), just keep it visible — no need to hide it and create
        // yet another placeholder next to it.
        if (original.hasAttribute(PLACEHOLDER_ATTRIBUTE)) {
          original.style.display = '';
          return;
        }

        // Hide the host-framework-managed original. We deliberately keep
        // its `src` attribute around so `resolveMediaUrl` can still derive
        // the backend origin when the user later picks a new media file
        // with a relative URL.
        original.style.display = 'none';

        // Move the source attr onto a placeholder div so the highlight
        // system keeps tracking the spot and the user can click to re-add
        // media.
        original.removeAttribute(SOURCE_ATTRIBUTE);
        const placeholder = createMediaPlaceholder(sourceAttr, rect);
        original.parentNode?.insertBefore(placeholder, original.nextSibling);
        trackInjection(original, placeholder);
        return;
      }

      const desiredTag = mime?.startsWith('image/')
        ? 'IMG'
        : mime?.startsWith('video/')
          ? 'VIDEO'
          : mime?.startsWith('audio/')
            ? 'AUDIO'
            : null;

      // If the rendered element already shows the same media file as the
      // form value, do nothing. Compare by filename so we're agnostic to
      // URL representation — the host framework may have rendered a proxy
      // URL (e.g. Next.js's "/_next/image?url=...") that wouldn't match a
      // raw form-value URL string-wise but resolves to the same asset.
      const active = injection ?? original;
      const newFilename = getMediaFilename(url);
      const currentFilename = getMediaFilename(active.getAttribute('src') ?? '');
      const tagAlreadyMatches = !desiredTag || active.tagName === desiredTag;
      if (tagAlreadyMatches && newFilename && newFilename === currentFilename) {
        active.style.display = '';
        return;
      }

      // Resolve relative form-value URLs against the existing src's origin
      // so the swap targets the Strapi backend, not the iframe origin.
      const resolvedUrl = resolveMediaUrl(original, url);

      // No mime info — fall back to updating whatever's active
      if (!desiredTag) {
        if (active.getAttribute('src') !== resolvedUrl) {
          active.setAttribute('src', resolvedUrl);
        }
        active.style.display = '';
        return;
      }

      // Original's tag matches: restore it (removing any previous injection)
      if (original.tagName === desiredTag) {
        removeInjection();
        if (original.getAttribute('src') !== resolvedUrl) {
          original.setAttribute('src', resolvedUrl);
        }
        original.style.display = '';
        return;
      }

      // Existing injection of the right tag: just update its src
      if (injection && injection.tagName === desiredTag) {
        if (injection.getAttribute('src') !== resolvedUrl) {
          injection.setAttribute('src', resolvedUrl);
        }
        return;
      }

      // Need a fresh injection of the correct tag
      removeInjection();

      const newInjection = document.createElement(desiredTag) as HTMLElement;
      // Mirror the original's attributes so styling/classes carry over.
      // Skip src/srcset — those carry the *previous* media's URL and would
      // make the new element try to load it (a video element fed an image
      // URL renders a permanent "No supported format" error). We set src
      // explicitly below.
      // For audio, skip visual-sizing attributes too — image/video classes
      // (e.g. aspect-square, h-96) don't suit a horizontal audio control
      // and produce a giant empty box around the player.
      const isAudio = desiredTag === 'AUDIO';
      const skipForAudio = new Set(['class', 'style', 'width', 'height']);
      // If the original is itself a placeholder (the framework unmounted
      // the real media element after a save), skip its bookkeeping
      // attributes and dashed-box styling so the new injection looks like a
      // proper media element rather than a styled placeholder.
      const isFromPlaceholder = original.hasAttribute(PLACEHOLDER_ATTRIBUTE);
      const skipForPlaceholder = new Set([
        PLACEHOLDER_ATTRIBUTE,
        PLACEHOLDER_ORIGIN_ATTRIBUTE,
        'style',
      ]);
      Array.from(original.attributes).forEach((attr) => {
        if (attr.name === 'id' || attr.name === 'src' || attr.name === 'srcset') return;
        if (isAudio && skipForAudio.has(attr.name)) return;
        if (isFromPlaceholder && skipForPlaceholder.has(attr.name)) return;
        newInjection.setAttribute(attr.name, attr.value);
      });
      newInjection.setAttribute('src', resolvedUrl);
      if (desiredTag === 'VIDEO' || desiredTag === 'AUDIO') {
        newInjection.setAttribute('controls', '');
      }
      if (!isAudio && !isFromPlaceholder) {
        newInjection.style.cssText = original.style.cssText;
      }
      newInjection.style.display = '';

      // Hide the host-framework-managed original and let highlights track our injection
      original.style.display = 'none';
      original.removeAttribute(SOURCE_ATTRIBUTE);
      original.parentNode?.insertBefore(newInjection, original.nextSibling);
      trackInjection(original, newInjection);
    };

    const handleMessage = (event: MessageEvent) => {
      if (!event.data?.type) return;

      // The user typed in an input, reflect the change in the preview
      if (event.data.type === INTERNAL_EVENTS.STRAPI_FIELD_CHANGE) {
        const { field, value } = event.data.payload;
        if (!field) return;

        const matchedElements = Array.from(getElementsByPath(field)).filter(
          (el): el is HTMLElement => el instanceof HTMLElement
        );

        // A cleared media field is represented by a placeholder div sitting
        // where the (hidden or unmounted) original used to be. Treat it like
        // a media element here so the next change routes through
        // setMediaElement and tears the placeholder down. Standalone
        // placeholders (those whose original was unmounted by the host
        // framework after save) are not in the injection maps but still
        // need to be matchable.
        const isMediaTarget = (el: Element) =>
          isMediaElement(el) ||
          injectionToOriginal.has(el as HTMLElement) ||
          el.hasAttribute(PLACEHOLDER_ATTRIBUTE);

        // Multi-media field: value is an array of media items. After the
        // server change, every item shares `path=<field>`, so we map array
        // items to media elements in DOM order. (Adding/removing items
        // requires the host framework to re-render the gallery; we only
        // update the swappable bits in place here.)
        if (Array.isArray(value)) {
          const mediaEls = matchedElements.filter(isMediaTarget);
          mediaEls.forEach((el, index) => {
            const item = value[index];
            if (item && typeof item === 'object') {
              const url = (item as any).url as string | undefined;
              const mime = (item as any).mime as string | undefined;
              setMediaElement(el, url || null, mime);
            } else {
              setMediaElement(el, null);
            }
          });
        } else {
          matchedElements.forEach((element) => {
            if (isMediaTarget(element)) {
              const url = typeof value === 'object' && value !== null ? value.url : value;
              const mime =
                typeof value === 'object' && value !== null
                  ? (value.mime as string | undefined)
                  : undefined;
              setMediaElement(element, url || null, mime);
            } else {
              element.textContent = value || '';
            }
          });
        }

        // Handle nested media asset fields (caption, alt, etc.)
        // These are identified by model=plugin::upload.file in the source attribute
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const allSourceElements = document.querySelectorAll(`[${SOURCE_ATTRIBUTE}]`);

          allSourceElements.forEach((element) => {
            const sourceAttr = element.getAttribute(SOURCE_ATTRIBUTE);
            if (!sourceAttr) return;

            // Parse the source attribute as URL search params
            const params = new URLSearchParams(sourceAttr);
            const model = params.get('model');
            const elementPath = params.get('path');

            // Only process media asset fields
            if (model !== 'plugin::upload.file' || !elementPath) return;

            // Check if this element's path starts with the field path (e.g., "hero.caption" starts with "hero")
            if (elementPath.startsWith(`${field}.`)) {
              // Extract the property name (e.g., "caption" from "hero.caption")
              const propertyName = elementPath.slice(field.length + 1);
              const propertyValue = value[propertyName];
              if (element instanceof HTMLElement && propertyValue !== undefined) {
                element.textContent = propertyValue || '';
              }
            }
          });
        }

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

        // Set new focused field and highlight matching groups
        highlightManager.setFocusedField(field);
        const matchingGroups = highlightManager.findGroupForPath(field);
        matchingGroups.forEach((group, index) => {
          if (index === 0) {
            const first = group.elements.values().next().value;
            first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          group.highlight.classList.add('strapi-highlight-focused');
          highlightManager.focusedHighlights.push(group.highlight);
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
