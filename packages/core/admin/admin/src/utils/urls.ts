const prefixFileUrlWithBackendUrl = (fileURL?: string): string | undefined => {
  return !!fileURL && fileURL.startsWith('/') ? `${window.strapi.backendURL}${fileURL}` : fileURL;
};

/**
 * @description Creates an absolute URL, if there is no URL or it
 * is relative, we use the `window.location.origin` as a fallback.
 * IF it's an absolute URL, we return it as is.
 */
const createAbsoluteUrl = (url?: string): string => {
  if (!url) {
    return window.location.origin;
  }
  if (url.startsWith('/')) {
    /**
     * This will also manage protocol relative URLs which is fine because
     * as we can see from the test, we still get the expected result.
     */
    return new URL(url, window.location.origin).toString();
  } else {
    return url;
  }
};

export { createAbsoluteUrl, prefixFileUrlWithBackendUrl };
