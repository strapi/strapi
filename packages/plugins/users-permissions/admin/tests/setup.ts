/// <reference types="node" />
// The harness runs in Node; admin/tsconfig.json leaves Node types out for the browser source.
import '@testing-library/jest-dom/vitest';

import { ResizeObserver } from '@juggle/resize-observer';
import { act, cleanup } from '@testing-library/react';
import { styleSheetSerializer } from 'jest-styled-components/serializer';
import { format } from 'node:util';
import { notifyManager, setLogger } from 'react-query';
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
// As in the base harness (`@strapi/strapi/admin/test`): tests assert a failed request through the
// page, so react-query's own log of that failure is not console output to guard against.
setLogger({ log: () => {}, warn: () => {}, error: () => {} });

/**
 * Fails a test that logs a warning or an error, as the Jest harness does
 * (packages/admin-test-utils/src/setup.ts), with the same allowlist. The call throws there and
 * here; `afterEach` also fails the test when the logging code swallowed that error.
 */
const ALLOWED_WARNINGS = [/Future Flag Warning/i];
const ALLOWED_ERRORS = [
  /React does not recognize the .* prop on a DOM element/,
  /Unknown event handler property/,
  /Support for defaultProps will be removed/i,
  /inside a test was not wrapped in act/i,
];
const unexpectedLogs: string[] = [];
const failOnLog =
  (method: 'warn' | 'error', allowed: RegExp[]) =>
  (...args: unknown[]) => {
    const message = format(...args);

    if (allowed.some((pattern) => pattern.test(message))) {
      return;
    }

    unexpectedLogs.push(`console.${method}: ${message}`);
    throw new Error(message);
  };
// Patched in place, so modules that kept a reference to `console` before this runs are covered.
console.warn = failOnLog('warn', ALLOWED_WARNINGS);
console.error = failOnLog('error', ALLOWED_ERRORS);
// Runs after the cleanup below, since Vitest runs `afterEach` hooks in reverse order.
afterEach(() => {
  const logs = unexpectedLogs.splice(0);

  if (logs.length > 0) {
    throw new Error(`Unexpected console output:\n${logs.join('\n')}`);
  }
});

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
