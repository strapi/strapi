/**
 * strapi.fetch interface is currently an identical wrapper for Node fetch()
 * See createStrapiFetch in strapi/utils
 * However, we want to retain the ability to extend it in the future.
 * We will also keep Fetch as an interface to prevent a breaking change.
 * */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Fetch extends ReturnType<typeof fetch> {}
