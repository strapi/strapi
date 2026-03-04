import { format } from 'util';
import { ResizeObserver } from '@juggle/resize-observer';

/* -------------------------------------------------------------------------------------------------
 * IntersectionObserver
 * -----------------------------------------------------------------------------------------------*/

const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

/* -------------------------------------------------------------------------------------------------
 * ResizeObserver
 * -----------------------------------------------------------------------------------------------*/

window.ResizeObserver = ResizeObserver;

/* -------------------------------------------------------------------------------------------------
 * requestIdleCallback
 * -----------------------------------------------------------------------------------------------*/

type SetTimeout = typeof window.setTimeout;

window.setImmediate =
  window.setImmediate ||
  ((fn: Parameters<SetTimeout>[0], ...args: any[]) => window.setTimeout(fn, 0, ...args));

window.clearImmediate = window.clearImmediate || window.clearTimeout;

// @ts-expect-error – mocking for testing
window.requestIdleCallback = setImmediate;
// @ts-expect-error – mocking for testing
window.cancelIdleCallback = clearImmediate;

/* -------------------------------------------------------------------------------------------------
 * ResizeObserver
 * -----------------------------------------------------------------------------------------------*/

/**
 * If there's a prop type error then we want to throw an
 * error so that the test fails.
 *
 * In the CI we fail the entire process if anything is logged to the console.
 * This is to stop pollution, you shouldn't need to log _anything_ to the console
 * for tests.
 */
const patchedConsole = {
  ...window.console,
  warn(...args: any[]) {
    const msg = args
      .map((arg) => {
        if (arg && typeof arg === 'object' && 'message' in arg) {
          return String((arg as any).message);
        }

        return String(arg);
      })
      .join(' ');

    /**
     * React Router emits dev-only warnings about upcoming v7 behavior when `future`
     * flags are left undefined. We don't want test log pollution or flaky failures
     * from these informational warnings, so we drop them entirely.
     *
     * Everything else remains strict: any other warn fails the test.
     */
    if (/Future Flag Warning/i.test(msg)) {
      return;
    }

    throw new Error(format(...args));
  },
  error(...args: any[]) {
    const message = format(...args);

    if (
      /React does not recognize the .* prop on a DOM element/.test(message) ||
      /Unknown event handler property/.test(message)
    ) {
      return;
    }
    // Ignore act() warnings from sonner components which update state asynchronously
    if (/Support for defaultProps will be removed/gi.test(message)) {
      return;
    }

    if (
      /An update to (ForwardRef\(Toaster\)|Toast) inside a test was not wrapped in act/i.test(
        message
      )
    ) {
      return;
    }

    throw new Error(message);
  },
};

window.console = patchedConsole;
// Ensure `console.warn` (global) is patched too
globalThis.console = patchedConsole as any;

/* -------------------------------------------------------------------------------------------------
 * Strapi
 * -----------------------------------------------------------------------------------------------*/

window.strapi = {
  backendURL: 'http://localhost:1337',
  isEE: false,
  features: {
    SSO: 'sso',
    isEnabled: () => false,
  },
  future: {
    isEnabled: () => false,
  },
  projectType: 'Community',
  telemetryDisabled: true,
  flags: {
    nps: true,
    promoteEE: true,
  },
};

/* -------------------------------------------------------------------------------------------------
 * matchMedia
 * -----------------------------------------------------------------------------------------------*/

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    /**
     * @deprecated
     */
    addListener: jest.fn(),
    /**
     * @deprecated
     */
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

/* -------------------------------------------------------------------------------------------------
 * scrollTo
 * -----------------------------------------------------------------------------------------------*/

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

/* -------------------------------------------------------------------------------------------------
 * prompt
 * -----------------------------------------------------------------------------------------------*/

Object.defineProperty(window, 'prompt', {
  writable: true,
  value: jest.fn(),
});

/* -------------------------------------------------------------------------------------------------
 * URL
 * -----------------------------------------------------------------------------------------------*/

window.URL.createObjectURL = jest
  .fn()
  .mockImplementation((file) => `http://localhost:4000/assets/${file.name}`);

/* -------------------------------------------------------------------------------------------------
 * createRange
 * -----------------------------------------------------------------------------------------------*/

document.createRange = () => {
  const range = new Range();
  // @ts-expect-error we don't need to implement all the methods
  range.getClientRects = jest.fn(() => ({
    item: () => null,
    length: 0,
  }));

  return range;
};

/* -------------------------------------------------------------------------------------------------
 * localStorage
 * -----------------------------------------------------------------------------------------------*/

class LocalStorageMock {
  store: Map<string, string>;

  constructor() {
    this.store = new Map();
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    /**
     * We return null to avoid returning `undefined`
     * because `undefined` is not a valid JSON value.
     */
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: unknown) {
    this.store.set(key, String(value));
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  get length() {
    return this.store.size;
  }
}

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: new LocalStorageMock(),
});

/* -------------------------------------------------------------------------------------------------
 * PointerEvents
 * -----------------------------------------------------------------------------------------------*/

/**
 * JSDOM doesn't implement PointerEvent so we need to mock our own implementation
 * Default to mouse left click interaction
 * https://github.com/radix-ui/primitives/issues/1822
 * https://github.com/jsdom/jsdom/pull/2666
 */
class MockPointerEvent extends Event {
  button: number;

  ctrlKey: boolean;

  pointerType: string;

  constructor(
    type: string,
    props: EventInit & { button?: number; ctrlKey?: boolean; pointerType?: string }
  ) {
    super(type, props);
    this.button = props.button || 0;
    this.ctrlKey = props.ctrlKey || false;
    this.pointerType = props.pointerType || 'mouse';
  }
}

Object.defineProperty(window, 'PointerEvent', {
  writable: true,
  value: MockPointerEvent,
});

window.HTMLElement.prototype.scrollIntoView = jest.fn();
window.HTMLElement.prototype.releasePointerCapture = jest.fn();
window.HTMLElement.prototype.hasPointerCapture = jest.fn();

/* -------------------------------------------------------------------------------------------------
 * Navigator
 * -----------------------------------------------------------------------------------------------*/

/**
 * Navigator is a large object so we only mock the properties we need.
 */
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});
