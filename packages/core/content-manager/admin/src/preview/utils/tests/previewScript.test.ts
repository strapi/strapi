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

const runPreviewScript = () => {
  // Disable stega decoding: JSDOM has no stega library, so we plant data-strapi-source
  // attributes directly on elements rather than relying on invisible Unicode encoding.
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

/** Simulate a postMessage arriving from the admin panel into the preview iframe. */
const dispatchAdminMessage = (data: unknown) => {
  window.dispatchEvent(
    new MessageEvent('message', {
      data,
      source: window,
      origin: window.location.origin,
    })
  );
};

// ─── Blocks field changes ─────────────────────────────────────────────────────

describe('previewScript — blocks field changes', () => {
  beforeEach(async () => {
    document.body.innerHTML = '<div id="root">Preview content</div>';
    runPreviewScript();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  afterEach(() => {
    window.__strapi_previewCleanup?.();
    window.STRAPI_DISABLE_STEGA_DECODING = undefined;
  });

  test('a valid blocks value is forwarded to the host as a CustomEvent', () => {
    const handler = jest.fn();
    window.addEventListener(INTERNAL_EVENTS.STRAPI_FIELD_CHANGE, handler as EventListener);

    dispatchAdminMessage({
      type: INTERNAL_EVENTS.STRAPI_FIELD_CHANGE,
      payload: {
        field: 'body',
        value: [{ type: 'paragraph', children: [{ type: 'text', text: 'Hello' }] }],
      },
    });

    expect(handler.mock.calls[0][0].detail).toEqual({
      field: 'body',
      value: [{ type: 'paragraph', children: [{ type: 'text', text: 'Hello' }] }],
    });
  });

  test('non-blocks field values do not fire the host CustomEvent', () => {
    const handler = jest.fn();
    window.addEventListener(INTERNAL_EVENTS.STRAPI_FIELD_CHANGE, handler as EventListener);

    dispatchAdminMessage({
      type: INTERNAL_EVENTS.STRAPI_FIELD_CHANGE,
      payload: { field: 'title', value: 'A plain string' },
    });

    expect(handler).not.toHaveBeenCalled();
  });
});

// ─── Highlight zones ──────────────────────────────────────────────────────────

describe('previewScript — highlight zones', () => {
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

  test('all paragraphs of a blocks field share one highlight overlay', async () => {
    const count = await countHighlights(`
      <p data-strapi-source="fieldPath=body&path=body.0.children.0.text&type=blocks&documentId=doc-1">First</p>
      <p data-strapi-source="fieldPath=body&path=body.1.children.0.text&type=blocks&documentId=doc-1">Second</p>
    `);
    expect(count).toBe(1);
  });

  test('the same field appearing twice in the page shares one highlight overlay', async () => {
    const count = await countHighlights(`
      <h1 data-strapi-source="path=title&type=string&documentId=doc-1">Title</h1>
      <meta data-strapi-source="path=title&type=string&documentId=doc-1" content="Title" />
    `);
    expect(count).toBe(1);
  });

  test('separate fields each get their own highlight overlay', async () => {
    const count = await countHighlights(`
      <p data-strapi-source="path=title&type=string&documentId=doc-1">Title</p>
      <p data-strapi-source="path=description&type=string&documentId=doc-1">Description</p>
    `);
    expect(count).toBe(2);
  });
});

// ─── Double-clicking a field ──────────────────────────────────────────────────

describe('previewScript — double-clicking a field', () => {
  beforeEach(() => {
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

  /** Set up a page with one annotated element, run the script, dblclick the highlight,
   *  and return the `path` query string sent in STRAPI_FIELD_FOCUS_INTENT. */
  const dblclickHighlight = async (sourceAttr: string): Promise<string | undefined> => {
    document.body.innerHTML = `<p data-strapi-source="${sourceAttr}">Content</p>`;
    runPreviewScript();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const highlight = document.querySelector('.strapi-highlight') as HTMLElement;
    const spy = jest.spyOn(window, 'postMessage');
    highlight.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, cancelable: true, clientX: 50, clientY: 50 })
    );

    const focusCall = spy.mock.calls.find(
      ([data]) => (data as { type: string })?.type === INTERNAL_EVENTS.STRAPI_FIELD_FOCUS_INTENT
    );
    return focusCall?.[0].payload.path;
  };

  test('double-clicking a blocks field opens the editor at the field root, not the specific block path', async () => {
    const path = await dblclickHighlight(
      'fieldPath=body&path=body.0.children.0.text&type=blocks&documentId=doc-1'
    );
    expect(new URLSearchParams(path).get('path')).toBe('body');
  });

  test('double-clicking a string field opens the editor at that field path', async () => {
    const path = await dblclickHighlight('path=title&type=string&documentId=doc-1');
    expect(new URLSearchParams(path).get('path')).toBe('title');
  });
});

// ─── Blocks editing session ───────────────────────────────────────────────────

describe('previewScript — blocks editing session', () => {
  const containerRect = {
    left: 0,
    top: 10,
    right: 400,
    bottom: 300,
    width: 400,
    height: 290,
    x: 0,
    y: 10,
    toJSON: () => ({}),
  } as DOMRect;

  let rectSpy: jest.SpyInstance;

  beforeEach(async () => {
    document.body.innerHTML = `
      <div id="blocks-container">
        <p data-strapi-source="fieldPath=body&path=body.0.children.0.text&type=blocks&documentId=doc-1">First</p>
        <p data-strapi-source="fieldPath=body&path=body.1.children.0.text&type=blocks&documentId=doc-1">Second</p>
      </div>
    `;
    rectSpy = jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(containerRect);
    runPreviewScript();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  afterEach(() => {
    window.__strapi_previewCleanup?.();
    window.STRAPI_DISABLE_STEGA_DECODING = undefined;
    jest.restoreAllMocks();
  });

  test('starting an edit session hides the blocks container; ending it restores visibility', () => {
    const container = document.getElementById('blocks-container')!;

    dispatchAdminMessage({
      type: INTERNAL_EVENTS.STRAPI_BLOCKS_EDIT_START,
      payload: { fieldPath: 'body' },
    });
    expect(container).toHaveStyle({ visibility: 'hidden' });

    dispatchAdminMessage({
      type: INTERNAL_EVENTS.STRAPI_BLOCKS_EDIT_END,
      payload: { fieldPath: 'body' },
    });
    expect(container).not.toHaveStyle({ visibility: 'hidden' });
  });

  test('double-clicking the field works after the host re-renders the blocks content', () => {
    // Complete a session so the container is attached to the highlight group
    dispatchAdminMessage({
      type: INTERNAL_EVENTS.STRAPI_BLOCKS_EDIT_START,
      payload: { fieldPath: 'body' },
    });
    dispatchAdminMessage({
      type: INTERNAL_EVENTS.STRAPI_BLOCKS_EDIT_END,
      payload: { fieldPath: 'body' },
    });

    // Host re-renders: original stega elements are detached (zero rects), container stays
    rectSpy.mockImplementation(function (this: Element) {
      if (this.id === 'blocks-container') return containerRect;
      return {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect;
    });
    window.dispatchEvent(new Event('resize'));

    const spy = jest.spyOn(window, 'postMessage');
    (document.querySelector('.strapi-highlight') as HTMLElement).dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, cancelable: true, clientX: 50, clientY: 50 })
    );

    expect(
      spy.mock.calls.some(
        ([data]) => (data as { type: string })?.type === INTERNAL_EVENTS.STRAPI_FIELD_FOCUS_INTENT
      )
    ).toBe(true);
  });
});
