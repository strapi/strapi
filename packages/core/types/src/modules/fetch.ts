/**
 * strapi.fetch interface is currently an identical wrapper for Node fetch()
 * See createStrapiFetch in strapi/utils
 * However, we want to retain the ability to extend it in the future.
 * We will also keep Fetch as an interface to prevent a breaking change.
 * */

export interface Fetch {
  (input: RequestInfo | URL, init?: RequestInit | undefined): Promise<Response>;
}
