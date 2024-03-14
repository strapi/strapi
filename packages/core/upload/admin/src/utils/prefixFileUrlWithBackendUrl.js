/**
 * Create the file URL with the backend URL
 * @param {Object} asset
 * @param {String} fileURL - if true, return the file URL with the Backend url
 * if there's no file url or it doesn't start with a slash return the original file url.
 * @return {String} file Url
 */
const prefixFileUrlWithBackendUrl = (fileURL) => {
  return !!fileURL && fileURL.startsWith('/') ? `${window.strapi.backendURL}${fileURL}` : fileURL;
};

export default prefixFileUrlWithBackendUrl;
