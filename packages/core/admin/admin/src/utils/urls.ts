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
    return new URL(url, window.location.origin).toString();
  } else {
    return url;
  }
};

export { createAbsoluteUrl };
