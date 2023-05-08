/**
 * Check if an Url provided is Absolute or not
 * @param {string|undefined} url
 * @returns {boolean} the response to the question if the provided url is absolute or not
 */
const isAbsoluteUrl = (url) => {
  const absoluteUrlRegex = new RegExp('^(?:[a-z+]+:)?//', 'i');

  return absoluteUrlRegex.test(url);
};

export default isAbsoluteUrl;