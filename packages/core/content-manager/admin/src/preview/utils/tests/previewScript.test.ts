import * as fs from 'fs';
import * as path from 'path';

import { INTERNAL_EVENTS, PREVIEW_HIGHLIGHT_COLORS } from '../constants';
import { previewScript } from '../previewScript';

declare global {
  interface Window {
    __strapi_previewCleanup?: () => void;
    STRAPI_DISABLE_STEGA_DECODING?: boolean;
  }
}

const blocksValue = [
  {
    type: 'paragraph',
    children: [{ type: 'text', text: 'Hello' }],
  },
];

const runPreviewScript = () => {
  window.STRAPI_DISABLE_STEGA_DECODING = true;
  const script = `(${previewScript.toString()})(${JSON.stringify({
    shouldRun: true,
    colors: PREVIEW_HIGHLIGHT_COLORS,
  })})`;
  // eslint-disable-next-line no-eval
  eval(script);
};

describe('previewScript — blocks field changes', () => {
  beforeEach(async () => {
    document.body.innerHTML = '<div id="root">Preview content</div>';
    runPreviewScript();
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });

  afterEach(() => {
    window.__strapi_previewCleanup?.();
    window.STRAPI_DISABLE_STEGA_DECODING = undefined;
  });

  test('forwards blocks field changes to the host via a window CustomEvent', () => {
    const handler = jest.fn();
    window.addEventListener(INTERNAL_EVENTS.STRAPI_FIELD_CHANGE, handler as EventListener);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: INTERNAL_EVENTS.STRAPI_FIELD_CHANGE,
          payload: { field: 'body', value: blocksValue },
        },
      })
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({
      field: 'body',
      value: blocksValue,
    });
  });

  test('does not forward non-blocks field changes via the blocks CustomEvent path', () => {
    const handler = jest.fn();
    window.addEventListener(INTERNAL_EVENTS.STRAPI_FIELD_CHANGE, handler as EventListener);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: INTERNAL_EVENTS.STRAPI_FIELD_CHANGE,
          payload: { field: 'title', value: 'Plain title' },
        },
      })
    );

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('previewScript (server-side) — STRAPI_RESCAN_HIGHLIGHTS', () => {
  const serverScriptPath = path.resolve(
    __dirname,
    '../../../../../server/src/preview/controllers/previewScript.js'
  );

  beforeEach(async () => {
    document.body.innerHTML = '';
    window.STRAPI_DISABLE_STEGA_DECODING = true;
    const scriptText = fs.readFileSync(serverScriptPath, 'utf-8');
    const config = JSON.stringify({
      colors: PREVIEW_HIGHLIGHT_COLORS,
      events: INTERNAL_EVENTS,
      parentOrigin: window.location.origin,
    });
    // eslint-disable-next-line no-eval
    eval(`(function() { ${scriptText}; previewScript(${config}); })()`);
    // Let the async init chain (setupStegaDOMObserver → .then()) settle
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  afterEach(() => {
    window.__strapi_previewCleanup?.();
    window.STRAPI_DISABLE_STEGA_DECODING = undefined;
  });

  test('schedules a DOM rescan via requestAnimationFrame when the rescan message is received', () => {
    const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((fn) => {
      fn(0);
      return 0;
    });

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: INTERNAL_EVENTS.STRAPI_RESCAN_HIGHLIGHTS },
        // source must match window.parent (which equals window in jsdom) and
        // origin must match parentOrigin passed to previewScript
        source: window as unknown as WindowProxy,
        origin: window.location.origin,
      })
    );

    expect(rafSpy).toHaveBeenCalledTimes(1);
    rafSpy.mockRestore();
  });
});
