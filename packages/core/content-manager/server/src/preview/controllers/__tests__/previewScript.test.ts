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

// pickElementAtPoint only knows about marked (stega-tagged) nodes. Code blocks
// and images with no alt text are never marked, so a click on one finds no
// exact hit against the group's own elements — but that doesn't mean the
// block can't be resolved: findBlockIndex only needs a genuine DOM descendant
// of the field container, not a marked one. The double-click handler uses
// elementsFromPoint to find the real clicked element and resolves its
// position directly, rather than falling back to the nearest marked sibling
// (which is only reliable for "which field", not "which block").
describe('previewScript — unmarked click inside a blocks field resolves its own position', () => {
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

    // Two marked paragraphs (stega-tagged) around an unmarked image (empty alt)
    // and an unmarked code block — mirrors what content-source-maps.ts produces:
    // code text and images with no alt are intentionally never encoded.
    document.body.innerHTML = `
      <dd id="field">
        <p id="para0" data-strapi-source="${BLOCKS_SOURCE}">First paragraph</p>
        <img id="the-image" alt="" />
        <pre id="code-block"><code>const x = 1;</code></pre>
        <p id="para1" data-strapi-source="${BLOCKS_SOURCE}">Second paragraph</p>
      </dd>
    `;

    const sizes: Record<string, DOMRect> = {
      para0: rect(0, 0, 300, 20),
      'the-image': rect(0, 20, 300, 40),
      'code-block': rect(0, 60, 300, 40),
      para1: rect(0, 100, 300, 40),
    };
    Object.entries(sizes).forEach(([id, r]) => {
      const el = document.getElementById(id);
      if (el) el.getBoundingClientRect = () => r;
    });

    // jsdom doesn't implement elementsFromPoint at all — stub it with the
    // same coordinate-containment check real hit-testing would do, against
    // the elements above we gave real (mocked) rects.
    document.elementsFromPoint = ((x: number, y: number) =>
      ['para0', 'the-image', 'code-block', 'para1']
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => !!el)
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
        })) as typeof document.elementsFromPoint;

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

  const dblClickAt = (x: number, y: number) => {
    const highlight = document.querySelector('.strapi-highlight') as HTMLElement;
    const postMessageSpy = jest.spyOn(window, 'postMessage');

    highlight.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, cancelable: true, clientX: x, clientY: y })
    );

    const focusIntentCalls = postMessageSpy.mock.calls.filter(
      ([data]) => (data as { type?: string })?.type === INTERNAL_EVENTS.STRAPI_FIELD_FOCUS_INTENT
    );
    expect(focusIntentCalls).toHaveLength(1);
    postMessageSpy.mockRestore();

    return (focusIntentCalls[0][0] as { payload: { blockIndex: number | null } }).payload;
  };

  test('double-clicking the empty-alt image resolves its own position, not a neighboring paragraph', () => {
    // (10, 30) falls inside the image's rect (20-60), not any marked paragraph's.
    const payload = dblClickAt(10, 30);
    // Children of #field: para0=0, the-image=1, code-block=2, para1=3.
    expect(payload.blockIndex).toBe(1);
  });

  test('double-clicking the code block resolves its own position, not a neighboring paragraph', () => {
    // (10, 80) falls inside the code block's rect (60-100), not any marked paragraph's.
    const payload = dblClickAt(10, 80);
    // Children of #field: para0=0, the-image=1, code-block=2, para1=3.
    expect(payload.blockIndex).toBe(2);
  });

  test('double-clicking a marked paragraph still resolves its own block index', () => {
    // (10, 110) falls inside para1's rect (100-140) — an exact hit.
    const payload = dblClickAt(10, 110);
    // Children of #field: para0=0, the-image=1, code-block=2, para1=3.
    expect(payload.blockIndex).toBe(3);
  });

  test('double-clicking a live-typed (unsaved) paragraph resolves its own position', () => {
    // A paragraph the host just re-rendered from a live, unsaved edit is
    // unmarked too (nothing gets a stega tag until the field is saved) — same
    // as code blocks and alt-less images, it resolves via the real clicked
    // element's DOM position rather than any marker.
    const field = document.getElementById('field') as HTMLElement;
    const liveParagraph = document.createElement('p');
    liveParagraph.id = 'live-para';
    liveParagraph.textContent = 'Freshly typed, not saved yet';
    liveParagraph.getBoundingClientRect = () => rect(0, 140, 300, 20);
    field.appendChild(liveParagraph);

    const previousElementsFromPoint = document.elementsFromPoint;
    document.elementsFromPoint = ((x: number, y: number) => {
      const r = liveParagraph.getBoundingClientRect();
      const hit = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      return [...(hit ? [liveParagraph] : []), ...previousElementsFromPoint(x, y)];
    }) as typeof document.elementsFromPoint;

    // (10, 150) falls inside the live paragraph's rect (140-160) — no marked
    // element there, so this only reaches the fallback (non-exact) path.
    const payload = dblClickAt(10, 150);
    // Children of #field: para0=0, the-image=1, code-block=2, para1=3, live-para=4.
    expect(payload.blockIndex).toBe(4);
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

// computeGroupRect already derives a blocks field's highlight from its container's
// own rect when one is found (see findBlocksContainer), reading it fresh on every
// call — but nothing previously re-triggered that read while the user was typing
// in the side panel, only an explicit rescan (on popover close) did. New blocks
// added by a live, unsaved edit get no stega tag of their own (see the
// "blocks field forwarding" describe above), so only the container's own size
// change can signal that the highlight is now out of date.
describe('previewScript — blocks container resize is observed live', () => {
  const BLOCKS_SOURCE = 'path=content&fieldPath=content&type=blocks&documentId=doc1';

  // Per-instance mock: the real script creates two independent ResizeObservers
  // (the per-element `resizeObserver` from setupObservers, and the blocks-only
  // `containerResizeObserver` from createHighlightManager). A single
  // module-level `observedCallbacks` map shared across instances made one
  // observer's unobserve/disconnect silently delete or mask the other's
  // entries, which is exactly what hid the containerResizeObserver cleanup
  // leak this describe block's last test guards against.
  class MockResizeObserver {
    static instances: MockResizeObserver[] = [];

    callback: ResizeObserverCallback;

    observed = new Map<Element, ResizeObserverCallback>();

    disconnected = false;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
      MockResizeObserver.instances.push(this);
    }

    observe(target: Element) {
      this.observed.set(target, this.callback);
    }

    unobserve(target: Element) {
      this.observed.delete(target);
    }

    disconnect() {
      this.disconnected = true;
      this.observed.clear();
    }
  }

  const findObserverFor = (target: Element) =>
    MockResizeObserver.instances.find((instance) => instance.observed.has(target));

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
    MockResizeObserver.instances = [];
    global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

    (window as Window & { STRAPI_DISABLE_STEGA_DECODING?: boolean }).STRAPI_DISABLE_STEGA_DECODING =
      true;

    // A real field container: <dd> wraps a <p>, a genuine block-level tag, so
    // findBlocksContainer accepts <dd> as the field's own container.
    document.body.innerHTML = `
      <dd id="field">
        <p id="para" data-strapi-source="${BLOCKS_SOURCE}">Hello world</p>
      </dd>
    `;

    const field = document.getElementById('field') as HTMLElement;
    const para = document.getElementById('para') as HTMLElement;
    field.getBoundingClientRect = () => rect(100, 100, 320, 60);
    para.getBoundingClientRect = () => rect(100, 100, 300, 40);

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

  test('the field container is registered for resize observation', () => {
    const field = document.getElementById('field') as HTMLElement;
    expect(findObserverFor(field)).toBeDefined();
  });

  test('growing the container live-resizes the highlight without a rescan', () => {
    const field = document.getElementById('field') as HTMLElement;
    const highlight = document.querySelector('.strapi-highlight') as HTMLElement;

    // 60px content + 2*HIGHLIGHT_PADDING (2px)
    expect(parseFloat(highlight.style.height)).toBeCloseTo(64, 0);

    // Simulate the host adding a new block while the user types in the side
    // panel: the container grows, but the new block itself gets no stega tag
    // (it was never saved), so nothing but the container's own resize can
    // signal that the highlight is stale.
    field.getBoundingClientRect = () => rect(100, 100, 320, 140);
    const callback = findObserverFor(field)?.callback;
    expect(callback).toBeDefined();
    const noEntries: ResizeObserverEntry[] = [];
    callback?.(noEntries, null as unknown as ResizeObserver);

    // 140px content + 2*HIGHLIGHT_PADDING (2px)
    expect(parseFloat(highlight.style.height)).toBeCloseTo(144, 0);
  });

  test('shrinking the container live-resizes the highlight too', () => {
    const field = document.getElementById('field') as HTMLElement;
    const highlight = document.querySelector('.strapi-highlight') as HTMLElement;

    field.getBoundingClientRect = () => rect(100, 100, 320, 30);
    const callback = findObserverFor(field)?.callback;
    const noEntries: ResizeObserverEntry[] = [];
    callback?.(noEntries, null as unknown as ResizeObserver);

    // 30px content + 2*HIGHLIGHT_PADDING (2px)
    expect(parseFloat(highlight.style.height)).toBeCloseTo(34, 0);
  });

  test('the container resize observer disconnects on cleanup, without touching the per-element observer', () => {
    const field = document.getElementById('field') as HTMLElement;
    const containerObserver = findObserverFor(field);
    expect(containerObserver?.disconnected).toBe(false);

    // The per-element resizeObserver (from setupObservers) always observes
    // document.documentElement — grab it as a control to prove cleanup
    // reaches both observers independently, not just the blocks one.
    const elementObserver = findObserverFor(document.documentElement);
    expect(elementObserver?.disconnected).toBe(false);
    expect(elementObserver).not.toBe(containerObserver);

    (window as Window & { __strapi_previewCleanup?: () => void }).__strapi_previewCleanup?.();

    expect(containerObserver?.disconnected).toBe(true);
    expect(elementObserver?.disconnected).toBe(true);
  });

  test('highlight grows to cover a live-added image that dwarfs the marked paragraph', () => {
    const field = document.getElementById('field') as HTMLElement;
    const highlight = document.querySelector('.strapi-highlight') as HTMLElement;

    // Sanity check: starts sized to the small, already-established container.
    expect(parseFloat(highlight.style.height)).toBeCloseTo(64, 0);

    // Simulate a live edit: the host re-renders an unmarked <img> into the
    // SAME container node (its own wrapper doesn't change identity, only its
    // children do) and the container's own rect grows far past
    // MAX_CONTAINER_AREA_RATIO (6x) of the still-small marked paragraph
    // (300*40 = 12,000px² vs the new container's 320*660 = 211,200px², ~17.6x).
    // Without the fix, re-running the ratio-guarded discovery on this resize
    // would reject the still-correct container and collapse the highlight
    // down to the small union-of-marked-spans-plus-buffer fallback.
    field.getBoundingClientRect = () => rect(100, 100, 320, 660);
    const callback = findObserverFor(field)?.callback;
    expect(callback).toBeDefined();
    const noEntries: ResizeObserverEntry[] = [];
    callback?.(noEntries, null as unknown as ResizeObserver);

    // 660px content + 2*HIGHLIGHT_PADDING (2px)
    expect(parseFloat(highlight.style.height)).toBeCloseTo(664, 0);
  });
});

// findBlockIndex used to run its own copy of the walk-up-with-area-guard,
// gated on the ratio between the found container and the *clicked anchor's*
// own area (not the group's marked-union area) — so double-clicking a small
// but legitimately marked paragraph next to a large unmarked sibling (e.g. an
// image typed in live) could fail the guard and lose the block index, even
// though the container was already correctly established. It now shares
// getBlocksContainer with computeGroupRect, so an established container is
// trusted the same way in both places.
describe('previewScript — findBlockIndex resolves next to a large unmarked sibling', () => {
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

    // Start with only the small marked paragraph, so the container is
    // established (cached) while it's still proportionate — mirrors the real
    // sequence: server-rendered, marked content registers first, live edits
    // that add unmarked content come later.
    document.body.innerHTML = `
      <div id="field">
        <p id="para" data-strapi-source="${BLOCKS_SOURCE}">Hello world</p>
      </div>
    `;

    const field = document.getElementById('field') as HTMLElement;
    const para = document.getElementById('para') as HTMLElement;
    field.getBoundingClientRect = () => rect(100, 100, 320, 60);
    para.getBoundingClientRect = () => rect(100, 100, 300, 40);

    previewScript({ colors: COLORS, events: INTERNAL_EVENTS, parentOrigin: PARENT_ORIGIN });
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

    // Now simulate the live edit: an unmarked <img> (never stega-tagged) is
    // added inside the same container node, which grows far past
    // MAX_CONTAINER_AREA_RATIO (6x) of the still-small marked paragraph
    // (300*40 = 12,000px² vs the new container's 320*660 = 211,200px², ~17.6x).
    // This never re-registers anything (the image has no data-strapi-source),
    // so the container's cached identity is never re-validated against the
    // ratio guard before the double-click below.
    const image = document.createElement('img');
    image.id = 'the-image';
    image.getBoundingClientRect = () => rect(100, 160, 300, 600);
    field.appendChild(image);
    field.getBoundingClientRect = () => rect(100, 100, 320, 660);
  });

  afterEach(() => {
    (window as Window & { __strapi_previewCleanup?: () => void }).__strapi_previewCleanup?.();
    delete (window as Window & { STRAPI_DISABLE_STEGA_DECODING?: boolean })
      .STRAPI_DISABLE_STEGA_DECODING;
  });

  test('double-clicking the marked paragraph still resolves its block index', () => {
    const highlight = document.querySelector('.strapi-highlight') as HTMLElement;
    const postMessageSpy = jest.spyOn(window, 'postMessage');

    // (110, 110) falls inside the paragraph's rect — an exact hit.
    highlight.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, cancelable: true, clientX: 110, clientY: 110 })
    );

    const focusIntentCalls = postMessageSpy.mock.calls.filter(
      ([data]) => (data as { type?: string })?.type === INTERNAL_EVENTS.STRAPI_FIELD_FOCUS_INTENT
    );
    expect(focusIntentCalls).toHaveLength(1);
    const payload = (focusIntentCalls[0][0] as { payload: { blockIndex: number | null } }).payload;

    // Children of #field: para=0, the-image=1. Without the fix this would be
    // null — the guard rejecting the container relative to the paragraph's
    // own small area, even though it's the same, correctly-established one.
    expect(payload.blockIndex).toBe(0);

    postMessageSpy.mockRestore();
  });
});
