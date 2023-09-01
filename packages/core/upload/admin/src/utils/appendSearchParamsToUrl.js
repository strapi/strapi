/**
 * Append the given search params to the given URL.
 *
 * @param {String} url The URL string to append the search params to
 * @param {Object} params The object of search params to append to the URL
 * @returns {String} A string representing the URL with the search params appended
 */
const appendSearchParamsToUrl = ({ url, params }) => {
  if (url === undefined || params === undefined || typeof params !== 'object' || Object.entries(params).length === 0) {
    return url;
  }

  const urlObj = new URL(url);
  const urlParams = urlObj.searchParams;
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      urlParams.append(key, value);
    }
  });

  return urlObj.toString();
};

export { appendSearchParamsToUrl };
