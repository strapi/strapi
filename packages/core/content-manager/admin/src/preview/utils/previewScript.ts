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
  const HIGHLIGHT_PADDING = 2; // in pixels
  const HIGHLIGHT_HOVER_COLOR = window.__strapi_HIGHLIGHT_COLOR ?? '#4945ff'; // dark primary500
  const HIGHLIGHT_ACTIVE_COLOR = window.__strapi_HIGHLIGHT_COLOR ?? '#7b79ff'; // dark primary600
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

  // Live Preview logic will go here.
  // eslint-disable-next-line no-console
  console.log('Preview script running');

  const createOverlaySystem = () => {
    const existingOverlay = document.getElementById(OVERLAY_ID);
    if (existingOverlay) {
      existingOverlay.remove();
    }

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

  createOverlaySystem();
};

export { previewScript };
