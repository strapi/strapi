import type { Core, Modules } from '@strapi/types';
import { Dispatcher1Wrapper, ProxyAgent } from 'undici';

// TODO: once core Node exposes a stable way to create a ProxyAgent we will use that instead of undici

interface StrapiFetchOptions {
  logs?: boolean;
}

// Create a wrapper for Node's Fetch API that applies a global proxy
export const createStrapiFetch = (strapi: Core.Strapi, options?: StrapiFetchOptions): Fetch => {
  const { logs = true } = options ?? {};

  const strapiFetch: Fetch = (url, options) => {
    // Cast: the global RequestInit types its dispatcher with Node's bundled undici types, which
    // differ from the installed undici version; Dispatcher1Wrapper makes them compatible at runtime
    const fetchOptions = {
      ...(strapiFetch.dispatcher ? { dispatcher: strapiFetch.dispatcher } : {}),
      ...options,
    } as RequestInit;

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
