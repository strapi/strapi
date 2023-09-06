/**
 * Append the given search params to the given URL.
 *
 * @param {String} url The URL string to append the search params to
 * @param {Object} params The object of search params to append to the URL
 * @returns {String} A string representing the URL with the search params appended
 */
const appendSearchParamsToUrl = ({ url, params }) => {
  if (url === undefined || params === undefined || typeof params !== 'object') {
    return url;
  }

  const filteredParams = Object.fromEntries(
    Object.entries(params).filter((entry) => entry[1] !== undefined)
  );

  if (Object.entries(filteredParams).length === 0) return url;

  if (url.startsWith('/')) {
    // relative url
    const searchParams = new URLSearchParams(filteredParams).toString();

    return `${url}${url.includes('?') ? '&' : '?'}${searchParams}`;
  }

  // absolute url
  const urlObj = new URL(url);
  Object.entries(filteredParams).forEach(([key, value]) => {
    urlObj.searchParams.append(key, value);
  });

  return urlObj.toString();
};

export { appendSearchParamsToUrl };
