import type { Core, Modules } from '@strapi/types';
// Import undici's dispatchers from their own files: loading undici's main entry replaces the
// dispatcher of Node's built-in fetch, which then rejects requests that set their own
// Content-Length on Node 22/24 (https://github.com/nodejs/undici/issues/5500)
/* eslint-disable import/extensions -- required by the ESM build: undici has no exports map */
import ProxyAgent from 'undici/lib/dispatcher/proxy-agent.js';
import Dispatcher1Wrapper from 'undici/lib/dispatcher/dispatcher1-wrapper.js';
/* eslint-enable import/extensions */

// TODO: once core Node exposes a stable way to create a ProxyAgent we will use that instead of undici

interface StrapiFetchOptions {
  logs?: boolean;
}

// Node's built-in fetch adds its own Content-Length, and undici 8 dispatchers reject the duplicated
// header (https://github.com/nodejs/undici/issues/5500), so drop the caller's one when proxying.
// TODO: remove once https://github.com/nodejs/undici/pull/5502 is released and installed
const withoutContentLength = (
  input: Parameters<Fetch>[0],
  init?: RequestInit
): RequestInit | undefined => {
  const headers = new Headers(
    init?.headers ?? (input instanceof Request ? input.headers : undefined)
  );

  if (!headers.has('content-length')) {
    return init;
  }

  headers.delete('content-length');

  return { ...init, headers };
};

// Create a wrapper for Node's Fetch API that applies a global proxy
export const createStrapiFetch = (strapi: Core.Strapi, options?: StrapiFetchOptions): Fetch => {
  const { logs = true } = options ?? {};

  const strapiFetch: Fetch = (url, options) => {
    const { dispatcher } = strapiFetch;

    // Cast: the global RequestInit types its dispatcher with Node's bundled undici types, which
    // differ from the installed undici version; Dispatcher1Wrapper makes them compatible at runtime
    const fetchOptions = (
      dispatcher ? { dispatcher, ...withoutContentLength(url, options) } : options
    ) as RequestInit | undefined;

    if (logs) {
      strapi.log.debug(`Making request for ${url}`);
    }

    return fetch(url, fetchOptions);
  };

  const proxy =
    strapi.config.get<ConstructorParameters<typeof ProxyAgent>[0]>('server.proxy.fetch') ||
    strapi.config.get<string>('server.proxy.global');

  if (proxy) {
    if (logs) {
      strapi.log.info(`Using proxy for Fetch requests: ${proxy}`);
    }
    // Node's built-in fetch runs its own bundled undici, which may still use the legacy (v1)
    // dispatcher handler API that undici 8 removed. Dispatcher1Wrapper bridges both APIs.
    strapiFetch.dispatcher = new Dispatcher1Wrapper(new ProxyAgent(proxy));
  }

  return strapiFetch;
};

export type Fetch = Modules.Fetch.Fetch;
