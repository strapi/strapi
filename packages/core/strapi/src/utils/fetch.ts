import { HttpsProxyAgent, HttpsProxyAgentOptions } from 'https-proxy-agent';
import stringify from 'fast-json-stable-stringify';

import type { Strapi } from '@strapi/types';

export interface Fetch {
  (url: string, options: RequestInit): Promise<Response>;
  dispatcher?: HttpsProxyAgent;
}

// Create a wrapper for Node's Fetch API that applies a global proxy
export function createStrapiFetch(strapi: Strapi): Fetch {
  function strapiFetch(url: string, options: RequestInit) {
    const fetchOptions = {
      ...(strapiFetch.dispatcher ? { dispatcher: strapiFetch.dispatcher } : {}),
      ...options,
    };
    strapi.log.debug(`Fetch request for ${url} with ${stringify(fetchOptions)}`);
    return fetch(url, fetchOptions);
  }

  const { globalProxy: proxy } = strapi.config.get<{
    globalProxy: HttpsProxyAgentOptions;
  }>('server');

  if (proxy) {
    strapiFetch.dispatcher = new HttpsProxyAgent(proxy);
  }

  return strapiFetch;
}
