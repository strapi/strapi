import { HttpsProxyAgent, HttpsProxyAgentOptions } from 'https-proxy-agent';

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
    strapi.log.debug(`Fetch request for ${url}`);
    return fetch(url, fetchOptions);
  }

  const { globalProxy } = strapi.config.get<{
    globalProxy: HttpsProxyAgentOptions;
  }>('server');

  if (globalProxy) {
    strapiFetch.dispatcher = new HttpsProxyAgent(globalProxy);
  }

  return strapiFetch;
}
