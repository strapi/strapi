/**
 * `_q` must be encoded on both hops: `useQueryParams.setQuery` and the fetch
 * client both stringify with `{ encode: false }`, so an unencoded `&` would
 * truncate the query. `qs.parse` decodes `+` as a space, so `+` needs escaping
 * beyond what `encodeURIComponent` does.
 */
export const encodeSearchQuery = (value: string): string =>
  encodeURIComponent(value).replace(/\+/g, '%2B');
