import fs from 'node:fs';
import path from 'node:path';

import { INTERNAL_EVENTS, PREVIEW_HIGHLIGHT_COLORS } from '../constants';

declare global {
  interface Window {
    STRAPI_DISABLE_STEGA_DECODING?: boolean;
    __strapi_previewCleanup?: () => void;
    STRAPI_HIGHLIGHT_HOVER_COLOR?: string;
    STRAPI_HIGHLIGHT_ACTIVE_COLOR?: string;
  }
}

// Read the server-side script directly — it is the single source of truth.
const previewScriptSrc = fs.readFileSync(
  path.resolve(__dirname, '../../../../../server/src/preview/controllers/previewScript.js'),
  'utf-8'
);

const blocksValue = [
  {
    type: 'paragraph',
    children: [{ type: 'text', text: 'Hello' }],
  },
];

const runPreviewScript = () => {
  window.STRAPI_DISABLE_STEGA_DECODING = true;
  // eslint-disable-next-line no-eval
  eval(
    `(${previewScriptSrc})(${JSON.stringify({
      colors: PREVIEW_HIGHLIGHT_COLORS,
      events: INTERNAL_EVENTS,
      parentOrigin: window.location.origin,
    })})`
  );
};

/**
 * Dispatch a postMessage from the simulated admin panel to the preview script.
 * Must supply source and origin so the script's origin check passes in JSDOM
 * (window.parent === window, window.location.origin === 'http://localhost:1337').
 */
const dispatchAdminMessage = (data: unknown) => {
  window.dispatchEvent(
    new MessageEvent('message', {
      data,
      source: window,
      origin: window.location.origin,
    })
  );
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

    dispatchAdminMessage({
      type: INTERNAL_EVENTS.STRAPI_FIELD_CHANGE,
      payload: { field: 'body', value: blocksValue },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({
      field: 'body',
      value: blocksValue,
    });
  });

  test('does not forward non-blocks field changes via the blocks CustomEvent path', () => {
    const handler = jest.fn();
    window.addEventListener(INTERNAL_EVENTS.STRAPI_FIELD_CHANGE, handler as EventListener);

    dispatchAdminMessage({
      type: INTERNAL_EVENTS.STRAPI_FIELD_CHANGE,
      payload: { field: 'title', value: 'Plain title' },
    });

    expect(handler).not.toHaveBeenCalled();
  });

  test('does not forward an empty array as a blocks value', () => {
    const handler = jest.fn();
    window.addEventListener(INTERNAL_EVENTS.STRAPI_FIELD_CHANGE, handler as EventListener);

    dispatchAdminMessage({
      type: INTERNAL_EVENTS.STRAPI_FIELD_CHANGE,
      payload: { field: 'body', value: [] },
    });

    expect(handler).not.toHaveBeenCalled();
  });

  test('does not forward null as a blocks value', () => {
    const handler = jest.fn();
    window.addEventListener(INTERNAL_EVENTS.STRAPI_FIELD_CHANGE, handler as EventListener);

    dispatchAdminMessage({
      type: INTERNAL_EVENTS.STRAPI_FIELD_CHANGE,
      payload: { field: 'body', value: null },
    });

    expect(handler).not.toHaveBeenCalled();
  });

  test('does not forward an array of objects missing type and children', () => {
    const handler = jest.fn();
    window.addEventListener(INTERNAL_EVENTS.STRAPI_FIELD_CHANGE, handler as EventListener);

    dispatchAdminMessage({
      type: INTERNAL_EVENTS.STRAPI_FIELD_CHANGE,
      payload: { field: 'body', value: [{ foo: 'bar' }] },
    });

    expect(handler).not.toHaveBeenCalled();
  });

  test('does not forward an array of objects with a non-array children property', () => {
    const handler = jest.fn();
    window.addEventListener(INTERNAL_EVENTS.STRAPI_FIELD_CHANGE, handler as EventListener);

    dispatchAdminMessage({
      type: INTERNAL_EVENTS.STRAPI_FIELD_CHANGE,
      payload: { field: 'body', value: [{ type: 'paragraph', children: 'not an array' }] },
    });

    expect(handler).not.toHaveBeenCalled();
  });

  test('forwards a multi-block value and includes the full value in the CustomEvent detail', () => {
    const handler = jest.fn();
    window.addEventListener(INTERNAL_EVENTS.STRAPI_FIELD_CHANGE, handler as EventListener);

    const multiBlockValue = [
      { type: 'paragraph', children: [{ type: 'text', text: 'First' }] },
      { type: 'heading', level: 2, children: [{ type: 'text', text: 'Second' }] },
    ];

    dispatchAdminMessage({
      type: INTERNAL_EVENTS.STRAPI_FIELD_CHANGE,
      payload: { field: 'body', value: multiBlockValue },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ field: 'body', value: multiBlockValue });
  });
});

describe('previewScript — highlight grouping (deriveGroupKey)', () => {
  beforeEach(() => {
    window.STRAPI_DISABLE_STEGA_DECODING = true;
  });

  afterEach(() => {
    window.__strapi_previewCleanup?.();
    window.STRAPI_DISABLE_STEGA_DECODING = undefined;
  });

  const countHighlights = async (bodyHtml: string): Promise<number> => {
    document.body.innerHTML = bodyHtml;
    runPreviewScript();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return document.querySelectorAll('.strapi-highlight').length;
  };

  test('two blocks elements with the same fieldPath share one highlight', async () => {
    const count = await countHighlights(`
      <p data-strapi-source="fieldPath=body&path=body.0.children.0.text&type=blocks&documentId=doc-1">First</p>
      <p data-strapi-source="fieldPath=body&path=body.1.children.0.text&type=blocks&documentId=doc-1">Second</p>
    `);

    expect(count).toBe(1);
  });

  test('two regular elements with different paths get separate highlights', async () => {
    const count = await countHighlights(`
      <p data-strapi-source="path=title&type=string&documentId=doc-1">Title</p>
      <p data-strapi-source="path=description&type=string&documentId=doc-1">Description</p>
    `);

    expect(count).toBe(2);
  });

  test('two regular elements with the same source share one highlight', async () => {
    const count = await countHighlights(`
      <span data-strapi-source="path=title&type=string&documentId=doc-1">Title A</span>
      <span data-strapi-source="path=title&type=string&documentId=doc-1">Title B</span>
    `);

    expect(count).toBe(1);
  });

  test('blocks elements from different fields get separate highlights', async () => {
    const count = await countHighlights(`
      <p data-strapi-source="fieldPath=body&path=body.0.children.0.text&type=blocks&documentId=doc-1">Body</p>
      <p data-strapi-source="fieldPath=summary&path=summary.0.children.0.text&type=blocks&documentId=doc-1">Summary</p>
    `);

    expect(count).toBe(2);
  });
});

describe('previewScript — getFocusPath', () => {
  beforeEach(() => {
    window.STRAPI_DISABLE_STEGA_DECODING = true;
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      top: 20,
      right: 110,
      bottom: 120,
      width: 100,
      height: 100,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    } as DOMRect);
  });

  afterEach(() => {
    window.__strapi_previewCleanup?.();
    window.STRAPI_DISABLE_STEGA_DECODING = undefined;
    jest.restoreAllMocks();
  });

  const setupWithSource = async (sourceAttr: string) => {
    document.body.innerHTML = `<p data-strapi-source="${sourceAttr}">Content</p>`;
    runPreviewScript();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return document.querySelector('.strapi-highlight') as HTMLElement;
  };

  const getFocusIntentPath = (postMessageSpy: jest.SpyInstance): URLSearchParams | null => {
    const call = postMessageSpy.mock.calls.find(
      ([data]) => data?.type === INTERNAL_EVENTS.STRAPI_FIELD_FOCUS_INTENT
    );
    if (!call) return null;
    return new URLSearchParams(call[0].payload.path);
  };

  test('double-clicking a blocks element sends STRAPI_FIELD_FOCUS_INTENT redirected to the field path', async () => {
    const highlight = await setupWithSource(
      'fieldPath=body&path=body.0.children.0.text&type=blocks&documentId=doc-1'
    );

    const postMessageSpy = jest.spyOn(window, 'postMessage');
    highlight.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, cancelable: true, clientX: 50, clientY: 50 })
    );

    const path = getFocusIntentPath(postMessageSpy);
    expect(path).not.toBeNull();
    expect(path?.get('path')).toBe('body');
    expect(path?.get('fieldPath')).toBeNull();
  });

  test('double-clicking a regular element sends STRAPI_FIELD_FOCUS_INTENT with the direct path unchanged', async () => {
    const highlight = await setupWithSource('path=title&type=string&documentId=doc-1');

    const postMessageSpy = jest.spyOn(window, 'postMessage');
    highlight.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, cancelable: true, clientX: 50, clientY: 50 })
    );

    const path = getFocusIntentPath(postMessageSpy);
    expect(path).not.toBeNull();
    expect(path?.get('path')).toBe('title');
    expect(path?.get('fieldPath')).toBeNull();
  });
});
