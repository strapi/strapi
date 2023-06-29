import { ResizeObserver } from '@juggle/resize-observer';
import { format } from 'util';

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
 * ResizeObserver
 * -----------------------------------------------------------------------------------------------*/

/**
 * If there's a prop type error then we want to throw an
 * error so that the test fails.
 *
 * NOTE: This can be removed once we move to a typescript
 * setup & we throw tests on type errors.
 */

const error = console.error;
window.console = {
  ...window.console,
  error(...args: any[]) {
    error(...args);

    const message = format(...args);

    if (/(Invalid prop|Failed prop type)/gi.test(message)) {
      throw new Error(message);
    }
  },
};

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
  projectType: 'Community',
  telemetryDisabled: true,
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
