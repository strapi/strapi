import type { Core, Modules } from '@strapi/types';
import { ProxyAgent } from 'undici';

// TODO: once core Node exposes a stable way to create a ProxyAgent we will use that instead of undici

// Create a wrapper for Node's Fetch API that applies a global proxy
export const createStrapiFetch = (strapi: Core.Strapi): Modules.Fetch.Fetch => {
  function strapiFetch(url: RequestInfo | URL, options?: RequestInit) {
    const fetchOptions = {
      ...(strapiFetch.dispatcher ? { dispatcher: strapiFetch.dispatcher } : {}),
      ...options,
    };
    strapi.log.debug(`Making request for ${url}`);
    return fetch(url, fetchOptions);
  }

  const proxy =
    strapi.config.get<ConstructorParameters<typeof ProxyAgent>[0]>('server.proxy.fetch') ||
    strapi.config.get<string>('server.proxy.global');

  if (proxy) {
    strapi.log.info(`Using proxy for Fetch requests: ${proxy}`);
    strapiFetch.dispatcher = new ProxyAgent(proxy);
  }

  return strapiFetch;
};

export type Fetch = Modules.Fetch.Fetch;
