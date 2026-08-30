'use strict';

/**
 * Test utilities for mocking global fetch in API and integration tests,
 * so tests do not depend on remote servers (e.g. httpbin) and are reliable.
 *
 * Use withMockedFetch() to temporarily replace fetch; use createMockResponse()
 * to build Response-like objects for the mock.
 */

/**
 * Create a Response for use in fetch mocks.
 * @param {object} options
 * @param {number} [options.status=200]
 * @param {Record<string, string>} [options.headers={}]
 * @param {string|Buffer|ArrayBuffer|Uint8Array} [options.body]
 * @returns {Response}
 */
function createMockResponse({ status = 200, headers = {}, body } = {}) {
  const bodyBuffer = body == null ? new Uint8Array(0) : toUint8Array(body);
  const responseHeaders = new Headers(headers);
  if (bodyBuffer.length && !responseHeaders.has('Content-Length')) {
    responseHeaders.set('Content-Length', String(bodyBuffer.length));
  }
  return new Response(bodyBuffer, { status, headers: responseHeaders });
}

function toUint8Array(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (Buffer.isBuffer(value)) return new Uint8Array(value);
  if (typeof value === 'string') return new TextEncoder().encode(value);
  return new Uint8Array(0);
}

/**
 * Run an async function with global fetch replaced by a custom implementation.
 * Original fetch is restored when the function completes (or throws).
 *
 * @param {((url: string, init?: RequestInit) => Response | Promise<Response> | undefined)} mockFn
 *   Called for each fetch(url, init). Return a Response to mock, or undefined to use real fetch.
 * @param {() => Promise<void>} fn Async function to run while fetch is mocked.
 * @returns {Promise<void>}
 *
 * @example
 * const { withMockedFetch, createMockResponse } = require('api-tests/mock-fetch');
 *
 * await withMockedFetch(async (url) => {
 *   if (url === 'https://example.com/bytes/1000') {
 *     return createMockResponse({
 *       status: 200,
 *       headers: { 'Content-Length': '1000' },
 *       body: Buffer.alloc(1000),
 *     });
 *   }
 *   return undefined; // use real fetch
 * }, async () => {
 *   // make requests that trigger fetch
 * });
 */
async function withMockedFetch(mockFn, fn) {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      const normalizedUrl = typeof url === 'string' ? url : (url?.url ?? String(url));
      const response = await mockFn(normalizedUrl, init);
      if (response !== undefined) {
        return response;
      }
      return originalFetch.call(globalThis, url, init);
    };
    await fn();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

module.exports = {
  createMockResponse,
  withMockedFetch,
};
