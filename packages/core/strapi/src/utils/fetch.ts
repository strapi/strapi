import { HttpsProxyAgent, HttpsProxyAgentOptions } from 'https-proxy-agent';

import type { Strapi, Fetch } from '@strapi/types';

// Create a wrapper for Node's Fetch API that applies a global proxy
export function createStrapiFetch(strapi: Strapi): Fetch {
  const { globalProxy } = strapi.config.get<{
    globalProxy: HttpsProxyAgentOptions;
  }>('server');

  function strapiFetch(url: RequestInfo | URL, options: RequestInit = {}) {
    const fetchOptions = {
      ...(globalProxy ? { dispatcher: new HttpsProxyAgent(globalProxy) } : {}),
      ...options,
    };
    strapi.log.debug(`Making request for ${url}`);
    return fetch(url, fetchOptions);
  }

  return strapiFetch;
}
