const prefixFileUrlWithBackendUrl = (fileURL) => {
  return !!fileURL && fileURL.startsWith('/') ? `${strapi.backendURL}${fileURL}` : fileURL;
};

export default prefixFileUrlWithBackendUrl;
