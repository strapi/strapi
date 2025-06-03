import type { ProxyAgent } from 'undici';

/**
 * strapi.fetch interface is currently an identical wrapper for Node fetch()
 * See createStrapiFetch in strapi/utils
 * However, we want to retain the ability to extend it in the future.
 * */

export interface Fetch {
  (input: RequestInfo | URL, init?: RequestInit | undefined): Promise<Response>;
  dispatcher?: ProxyAgent;
}
