import type { Fetch, Strapi } from '@strapi/types';
import { ProxyAgent } from 'undici';

// TODO: once core Node exposes a stable way to create a ProxyAgent we will use that instead of undici

// Create a wrapper for Node's Fetch API that applies a global proxy
export function createStrapiFetch(strapi: Strapi): Fetch {
  function strapiFetch(url: RequestInfo | URL, options?: RequestInit) {
    const fetchOptions = {
      ...(strapiFetch.dispatcher ? { dispatcher: strapiFetch.dispatcher } : {}),
      ...options,
    };
    strapi.log.debug(`Making request for ${url}`);
    return fetch(url, fetchOptions);
  }

  const globalProxy =
    strapi.config.get<ConstructorParameters<typeof ProxyAgent>[0]>('server.globalProxy');

  if (globalProxy) {
    strapiFetch.dispatcher = new ProxyAgent(globalProxy);
  }

  return strapiFetch;
}
