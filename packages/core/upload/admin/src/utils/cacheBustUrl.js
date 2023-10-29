import { appendSearchParamsToUrl } from './appendSearchParamsToUrl';

/**
 * Url cache busting.
 * Appends an "updatedAt" parameter to the URL with the timestamp. 
 *
 * @param {string} url - The original URL.
 * @param {string} timestamp - The timestamp to add for cache busting.
 * @returns {string} The cache-busted URL.
 */
const cacheBustUrl = ({ url, timestamp }) => {

    if (url === undefined || typeof timestamp !== 'string') {
      return url;
    }

    return appendSearchParamsToUrl({
        url,
        params: { updatedAt: timestamp },
    })
}
  

export { cacheBustUrl };

  