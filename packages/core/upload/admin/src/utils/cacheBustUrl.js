import { appendSearchParamsToUrl } from './appendSearchParamsToUrl';

/**
 * Url cache busting.
 * Appends an "updatedAt" parameter to the URL with the timestamp. 
 * Skips the operation if a timestamp already exists within the query parameters.
 *
 * @param {string} url - The original URL.
 * @param {string} timestamp - The timestamp to add for cache busting.
 * @returns {string} The cache-busted URL.
 */
const cacheBustUrl = ({ url, timestamp }) => {
    if (url === undefined || typeof timestamp !== 'string') {
      return url;
    }
    
    // Matches ISO 8601 timestamps with or without milliseconds
    const timestampRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z|\d{8}T\d{6}Z/;

    const urlObject = new URL(url, window.strapi.backendURL);
    const searchParams = urlObject.searchParams;
    const searchParamValues = Array.from(searchParams.values());

    if (searchParamValues.some((value) => timestampRegex.test(value))) {
        // URL already has a timestamp in a query parameter, no need to cache bust
        return urlObject.toString();
    }

    return appendSearchParamsToUrl({
        url,
        params: { updatedAt: timestamp },
    })
}
  

export { cacheBustUrl };

  