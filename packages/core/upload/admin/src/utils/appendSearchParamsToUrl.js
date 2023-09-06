/**
 * Append the given search params to the given URL.
 *
 * @param {String} url The URL string to append the search params to
 * @param {Object} params The object of search params to append to the URL
 * @returns {String} A string representing the URL with the search params appended
 */
const appendSearchParamsToUrl = ({ url, params }) => {
  if (
    url === undefined ||
    params === undefined ||
    typeof params !== 'object' ||
    Object.entries(params).length === 0
  ) {
    return url;
  }

  const placeholderUrl = 'https://placeholder.com';
  let didUsePlaceholderUrl = false;
  let urlObj;
  try {
    urlObj = new URL(url);
  } catch (e) {
    urlObj = new URL(`${placeholderUrl}${url}`);
    didUsePlaceholderUrl = true;
  }

  const urlParams = urlObj.searchParams;
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      urlParams.append(key, value);
    }
  });

  const result = urlObj.toString();

  return didUsePlaceholderUrl ? result.replace(placeholderUrl, '') : result;
};

export { appendSearchParamsToUrl };
