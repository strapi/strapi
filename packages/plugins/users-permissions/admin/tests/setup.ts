import '@testing-library/jest-dom/vitest';

import { ResizeObserver } from '@juggle/resize-observer';
import { act, cleanup } from '@testing-library/react';
import { styleSheetSerializer } from 'jest-styled-components/serializer';
import { notifyManager } from 'react-query';
import { afterAll, afterEach, beforeAll, expect, vi } from 'vitest';

import { server } from './server';

expect.addSnapshotSerializer(styleSheetSerializer);

// Node also exposes Web Storage globals, which Vitest leaves in place instead of JSDOM's.
vi.stubGlobal('localStorage', jsdom.window.localStorage);
vi.stubGlobal('sessionStorage', jsdom.window.sessionStorage);
vi.stubGlobal('ResizeObserver', ResizeObserver);
vi.stubGlobal(
  'IntersectionObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);
vi.stubGlobal(
  'matchMedia',
  vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
);
vi.stubGlobal('requestIdleCallback', setImmediate);
vi.stubGlobal('cancelIdleCallback', clearImmediate);
vi.stubGlobal('scrollTo', vi.fn());
vi.stubGlobal('PointerEvent', MouseEvent);
HTMLElement.prototype.scrollIntoView = vi.fn();
HTMLElement.prototype.releasePointerCapture = vi.fn();
HTMLElement.prototype.hasPointerCapture = vi.fn();
URL.createObjectURL = vi.fn((file: File) => `http://localhost:4000/assets/${file.name}`);
Object.assign(window, {
  strapi: {
    backendURL: 'http://localhost:1337',
    isEE: process.env.IS_EE === 'true',
    features: { SSO: 'sso', isEnabled: () => false },
    future: { isEnabled: () => false },
    featureFlags: { isEnabled: () => false },
    projectType: process.env.IS_EE === 'true' ? 'Enterprise' : 'Community',
    telemetryDisabled: true,
    flags: { nps: true, promoteEE: true },
  },
});
notifyManager.setNotifyFunction((fn) => act(fn));
notifyManager.setBatchNotifyFunction((fn) => act(fn));
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
