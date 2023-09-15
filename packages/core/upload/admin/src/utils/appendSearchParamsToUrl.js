/**
 * Append the given search params to the given URL.
 *
 * @param {String} url The URL string to append the search params to
 * @param {Object} params The object of search params to append to the URL
 * @returns {String} A string representing the URL with the search params appended
 */
const appendSearchParamsToUrl = ({ url, params }) => {
  if (url === undefined || typeof params !== 'object') {
    return url;
  }

  const urlObj = new URL(url, window.strapi.backendURL);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      urlObj.searchParams.append(key, value);
    }
  });

  return urlObj.toString();
};

export { appendSearchParamsToUrl };
