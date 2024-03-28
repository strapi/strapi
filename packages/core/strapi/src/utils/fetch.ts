import type { RequestInit, Response } from 'node-fetch';
import nodeFetch from 'node-fetch';
import type { HttpsProxyAgentOptions } from 'https-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

import type { Strapi } from '@strapi/types';

export interface Fetch {
  (url: string, options: RequestInit): Promise<Response>;
  agent?: HttpsProxyAgent;
}

export function createStrapiFetch(strapi: Strapi): Fetch {
  function fetch(url: string, options: RequestInit) {
    return nodeFetch(url, {
      ...(fetch.agent ? { agent: fetch.agent } : {}),
      ...options,
    });
  }

  const { globalProxy: proxy } = strapi.config.get<{
    globalProxy: HttpsProxyAgentOptions;
  }>('server');

  if (proxy) {
    fetch.agent = new HttpsProxyAgent(proxy);
  }

  return fetch;
}
