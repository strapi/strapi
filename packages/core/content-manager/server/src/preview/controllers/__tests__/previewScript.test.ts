/**
 * @jest-environment jsdom
 *
 * Tests for the real previewScript.js iframe bundle — blocks-field forwarding behaviour.
 *
 * The script is self-contained (no imports) and is designed to run in a browser, so we
 * use jsdom and a few lightweight mocks to replicate the iframe environment.
 *
 * previewScript.js has no module.exports — it declares `function previewScript(config)`.
 * We read the raw source from disk (bypassing Jest's Istanbul transform) and evaluate it
 * via new Function so that Istanbul's cov_* counters aren't injected into the code we run.
 */
/// <reference lib="dom" />

import * as fs from 'node:fs';
import * as path from 'node:path';

const scriptSource = fs.readFileSync(path.join(__dirname, '../previewScript.js'), 'utf-8');
// Evaluate the source in a fresh function scope and extract the declared function.
// new Function is intentional here: previewScript.js is a self-contained IIFE with no
// module.exports, and reading the raw source bypasses Jest's Istanbul transform so that
// cov_* counters are not injected into the evaluated code.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const previewScript: (config: unknown) => void = new Function(
  `${scriptSource}; return previewScript;`
)();

// 'strapiFieldChange' is hardcoded in previewScript.js as a public stable event name.
const STRAPI_FIELD_CHANGE = 'strapiFieldChange';

const INTERNAL_EVENTS = {
  STRAPI_FIELD_FOCUS: 'strapiFieldFocus',
  STRAPI_FIELD_BLUR: 'strapiFieldBlur',
  STRAPI_FIELD_FOCUS_INTENT: 'strapiFieldFocusIntent',
  STRAPI_FIELD_SINGLE_CLICK_HINT: 'strapiFieldSingleClickHint',
  STRAPI_IFRAME_CLICK: 'strapiIframeClick',
  STRAPI_RESCAN_HIGHLIGHTS: 'strapiRescanHighlights',
};

const COLORS = {
  highlightHoverColor: '#7234d4',
  highlightActiveColor: '#4945FF',
};

// In jsdom window.parent === window, so postMessage round-trips back to the same window.
// The real script validates event.source === window.parent, which this satisfies.
const PARENT_ORIGIN = 'http://localhost:1337';

const sendMessage = (data: unknown) => {
  window.dispatchEvent(
    new MessageEvent('message', {
      data,
      origin: PARENT_ORIGIN,
      source: window as unknown as MessageEventSource,
    })
  );
};

const blocksValue = [{ type: 'paragraph', children: [{ type: 'text', text: 'Hello' }] }];

describe('previewScript — blocks field forwarding', () => {
  beforeEach(async () => {
    // ResizeObserver is used by the highlight system but not available in jsdom
    global.ResizeObserver = class {
      observe() {}

      unobserve() {}

      disconnect() {}
    } as unknown as typeof ResizeObserver;

    (window as Window & { STRAPI_DISABLE_STEGA_DECODING?: boolean }).STRAPI_DISABLE_STEGA_DECODING =
      true;

    document.body.innerHTML = '<div id="root">Preview content</div>';

    previewScript({ colors: COLORS, events: INTERNAL_EVENTS, parentOrigin: PARENT_ORIGIN });

    // The script initialises inside a Promise.then(); flush the microtask queue
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  });

  afterEach(() => {
    (window as Window & { __strapi_previewCleanup?: () => void }).__strapi_previewCleanup?.();
    delete (window as Window & { STRAPI_DISABLE_STEGA_DECODING?: boolean })
      .STRAPI_DISABLE_STEGA_DECODING;
  });

  test('forwards a blocks field change to the host as a CustomEvent', () => {
    const handler = jest.fn();
    window.addEventListener(STRAPI_FIELD_CHANGE, handler as EventListener);

    sendMessage({
      type: STRAPI_FIELD_CHANGE,
      payload: { field: 'body', value: blocksValue },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({
      field: 'body',
      value: blocksValue,
    });
  });

  test('forwards a blocks field clear (null value) when type is "blocks"', () => {
    const handler = jest.fn();
    window.addEventListener(STRAPI_FIELD_CHANGE, handler as EventListener);

    sendMessage({
      type: STRAPI_FIELD_CHANGE,
      payload: { field: 'body', value: null, type: 'blocks' },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({
      field: 'body',
      value: null,
    });
  });

  test('forwards a blocks field clear (empty array) when type is "blocks"', () => {
    const handler = jest.fn();
    window.addEventListener(STRAPI_FIELD_CHANGE, handler as EventListener);

    sendMessage({
      type: STRAPI_FIELD_CHANGE,
      payload: { field: 'body', value: [], type: 'blocks' },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({
      field: 'body',
      value: [],
    });
  });

  test('does not forward a plain string value', () => {
    const handler = jest.fn();
    window.addEventListener(STRAPI_FIELD_CHANGE, handler as EventListener);

    sendMessage({ type: STRAPI_FIELD_CHANGE, payload: { field: 'title', value: 'Plain title' } });

    expect(handler).not.toHaveBeenCalled();
  });

  test('does not forward a blocks-shaped node missing the children array', () => {
    const handler = jest.fn();
    window.addEventListener(STRAPI_FIELD_CHANGE, handler as EventListener);

    sendMessage({
      type: STRAPI_FIELD_CHANGE,
      payload: { field: 'body', value: [{ type: 'paragraph' }] },
    });

    expect(handler).not.toHaveBeenCalled();
  });

  test('does not forward a blocks-shaped node missing the type field', () => {
    const handler = jest.fn();
    window.addEventListener(STRAPI_FIELD_CHANGE, handler as EventListener);

    sendMessage({
      type: STRAPI_FIELD_CHANGE,
      payload: { field: 'body', value: [{ children: [] }] },
    });

    expect(handler).not.toHaveBeenCalled();
  });

  test('does not forward a blocks-shaped node where children is not an array', () => {
    const handler = jest.fn();
    window.addEventListener(STRAPI_FIELD_CHANGE, handler as EventListener);

    sendMessage({
      type: STRAPI_FIELD_CHANGE,
      payload: { field: 'body', value: [{ type: 'paragraph', children: 'text' }] },
    });

    expect(handler).not.toHaveBeenCalled();
  });

  test('ignores messages from unknown origins', () => {
    const handler = jest.fn();
    window.addEventListener(STRAPI_FIELD_CHANGE, handler as EventListener);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: STRAPI_FIELD_CHANGE, payload: { field: 'body', value: blocksValue } },
        origin: 'http://evil.example.com',
        source: window as unknown as MessageEventSource,
      })
    );

    expect(handler).not.toHaveBeenCalled();
  });
});

// @strapi/blocks-react-renderer renders nested lists as direct children of <ul>/<ol>
// (not wrapped in a <li>), so the outer list container has a block-level child (<ol>/<ul>)
// that satisfied the field-container check — incorrectly treating <ul> as the field
// container and returning the <li>'s index within <ul> instead of <ul>'s index in the
// real blocks-container.
describe('previewScript — findBlockIndex for nested lists', () => {
  const BLOCKS_SOURCE = 'path=content&fieldPath=content&type=blocks&documentId=doc1';

  beforeEach(async () => {
    global.ResizeObserver = class {
      observe() {}

      unobserve() {}

      disconnect() {}
    } as unknown as typeof ResizeObserver;

    (window as Window & { STRAPI_DISABLE_STEGA_DECODING?: boolean }).STRAPI_DISABLE_STEGA_DECODING =
      true;

    // Paragraph at index 0 (no source attr), list at index 1. Only the outer <li>
    // carries data-strapi-source so it is the sole group member — pickElementAtPoint
    // returns it regardless of zero bounding rects in jsdom.
    document.body.innerHTML = `
      <div id="blocks-container">
        <p id="para">Paragraph</p>
        <ul id="outer-ul">
          <li id="outer-li" data-strapi-source="${BLOCKS_SOURCE}">Outer item</li>
          <ol id="nested-ol">
            <li id="nested-li">Nested item</li>
          </ol>
        </ul>
      </div>
    `;

    previewScript({ colors: COLORS, events: INTERNAL_EVENTS, parentOrigin: PARENT_ORIGIN });

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  });

  afterEach(() => {
    (window as Window & { __strapi_previewCleanup?: () => void }).__strapi_previewCleanup?.();
    delete (window as Window & { STRAPI_DISABLE_STEGA_DECODING?: boolean })
      .STRAPI_DISABLE_STEGA_DECODING;
  });

  test('blockIndex is the <ul> position in the blocks container, not the <li> position within <ul>', () => {
    const highlight = document.querySelector('.strapi-highlight') as HTMLElement;
    expect(highlight).toBeTruthy();

    // window.parent === window in jsdom, so sendMessage calls window.postMessage.
    // Spy on it directly to avoid relying on jsdom's async MessageEvent dispatch.
    const postMessageSpy = jest.spyOn(window, 'postMessage');

    highlight.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, cancelable: true, clientX: 0, clientY: 0 })
    );

    const focusIntentCalls = postMessageSpy.mock.calls.filter(
      ([data]) => (data as { type?: string })?.type === INTERNAL_EVENTS.STRAPI_FIELD_FOCUS_INTENT
    );
    expect(focusIntentCalls).toHaveLength(1);

    const payload = (focusIntentCalls[0][0] as { payload: { blockIndex: number | null } }).payload;
    // <ul> is at DOM index 1 in blocks-container (after <p>).
    // Before the fix this was 0 — the <li>'s index within <ul>.
    expect(payload.blockIndex).toBe(1);

    postMessageSpy.mockRestore();
  });
});

// An image-only blocks field renders no block-level tag (<img> is not in
// BLOCK_LEVEL_TAGS), so the container walk-up finds no match inside the field
// and escapes into page layout. Without an area guard it matched a page-level
// container, stretching the highlight over the whole document — and because
// highlights sit on top and swallow clicks, the rest of the preview became
// unclickable.
describe('previewScript — image-only blocks field does not swallow the page', () => {
  const BLOCKS_SOURCE = 'path=content&fieldPath=content&type=blocks&documentId=doc1';

  const rect = (left: number, top: number, width: number, height: number) =>
    ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON() {},
    }) as DOMRect;

  beforeEach(async () => {
    global.ResizeObserver = class {
      observe() {}

      unobserve() {}

      disconnect() {}
    } as unknown as typeof ResizeObserver;

    (window as Window & { STRAPI_DISABLE_STEGA_DECODING?: boolean }).STRAPI_DISABLE_STEGA_DECODING =
      true;

    // Mirrors the real shape: the image sits in wrappers that contain no
    // block-level tag, while a page-level ancestor does (<h3> + <dl>).
    document.body.innerHTML = `
      <div id="page">
        <h3 id="heading">Rest API data</h3>
        <dl id="list">
          <dd id="field">
            <div id="img-wrap">
              <img id="the-image" data-strapi-source="${BLOCKS_SOURCE}" alt="Hero" />
            </div>
          </dd>
        </dl>
      </div>
    `;

    // jsdom has no layout: give the image a small rect and the page ancestor a huge one.
    const sizes: Record<string, DOMRect> = {
      'the-image': rect(600, 400, 500, 300),
      'img-wrap': rect(600, 400, 500, 300),
      field: rect(600, 400, 500, 300),
      list: rect(50, 150, 1000, 600),
      page: rect(50, 150, 1100, 3000),
      heading: rect(50, 150, 1100, 20),
    };
    Object.entries(sizes).forEach(([id, r]) => {
      const el = document.getElementById(id);
      if (el) el.getBoundingClientRect = () => r;
    });

    previewScript({ colors: COLORS, events: INTERNAL_EVENTS, parentOrigin: PARENT_ORIGIN });

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  });

  afterEach(() => {
    (window as Window & { __strapi_previewCleanup?: () => void }).__strapi_previewCleanup?.();
    delete (window as Window & { STRAPI_DISABLE_STEGA_DECODING?: boolean })
      .STRAPI_DISABLE_STEGA_DECODING;
  });

  test('the highlight tracks the image, not the page-level container', () => {
    const highlight = document.querySelector('.strapi-highlight') as HTMLElement;
    expect(highlight).toBeTruthy();

    // The page ancestor is 1100x3000; the image is 500x300. The highlight must
    // stay proportionate to the image (plus the empty-trailing-block buffer).
    const width = parseFloat(highlight.style.width);
    const height = parseFloat(highlight.style.height);

    expect(width).toBeLessThan(700);
    expect(height).toBeLessThan(700);
  });
});

// The trailing buffer keeps empty blocks (which carry no stega span) clickable,
// but an unconditional buffer spilled past the field and covered whatever the
// host rendered underneath — swallowing that element's clicks.
describe('previewScript — trailing buffer stays inside the blocks field', () => {
  const BLOCKS_SOURCE = 'path=content&fieldPath=content&type=blocks&documentId=doc1';

  const rect = (left: number, top: number, width: number, height: number) =>
    ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON() {},
    }) as DOMRect;

  const setup = async (fieldHeight: number) => {
    global.ResizeObserver = class {
      observe() {}

      unobserve() {}

      disconnect() {}
    } as unknown as typeof ResizeObserver;

    (window as Window & { STRAPI_DISABLE_STEGA_DECODING?: boolean }).STRAPI_DISABLE_STEGA_DECODING =
      true;

    // An image-only field: no block-level tag inside, so the container walk-up
    // finds nothing and the union + buffer path is used.
    document.body.innerHTML = `
      <div id="page">
        <dd id="field">
          <img id="the-image" data-strapi-source="${BLOCKS_SOURCE}" alt="Hero" />
        </dd>
        <dt id="next-field">authorName</dt>
      </div>
    `;

    // Image occupies 300px; the field wrapper may extend further when it holds
    // an empty trailing block.
    const sizes: Record<string, DOMRect> = {
      'the-image': rect(600, 400, 500, 300),
      field: rect(600, 400, 500, fieldHeight),
      'next-field': rect(600, 400 + fieldHeight + 20, 500, 20),
      // Page wrapper starts above the field, as real layout does, so the
      // clamp walk stops at the field wrapper rather than inheriting page height.
      page: rect(600, 300, 500, fieldHeight + 200),
    };
    Object.entries(sizes).forEach(([id, r]) => {
      const el = document.getElementById(id);
      if (el) el.getBoundingClientRect = () => r;
    });

    previewScript({ colors: COLORS, events: INTERNAL_EVENTS, parentOrigin: PARENT_ORIGIN });
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  };

  afterEach(() => {
    (window as Window & { __strapi_previewCleanup?: () => void }).__strapi_previewCleanup?.();
    delete (window as Window & { STRAPI_DISABLE_STEGA_DECODING?: boolean })
      .STRAPI_DISABLE_STEGA_DECODING;
  });

  test('does not extend past the field when there is no trailing block', async () => {
    // Field is exactly as tall as the image: nothing to pad into.
    await setup(300);

    const highlight = document.querySelector('.strapi-highlight') as HTMLElement;
    const height = parseFloat(highlight.style.height);

    // Without the clamp this was 300 + 80 = 380, covering the next field.
    expect(height).toBeLessThanOrEqual(310);
  });

  test('still covers an empty trailing block inside the field', async () => {
    // Field is taller than the image — an empty trailing block occupies the rest.
    await setup(360);

    const highlight = document.querySelector('.strapi-highlight') as HTMLElement;
    const height = parseFloat(highlight.style.height);

    // Grows to the field's real bottom rather than stopping at the image.
    expect(height).toBeGreaterThanOrEqual(355);
    expect(height).toBeLessThanOrEqual(380);
  });
});
