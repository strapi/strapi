const prefixFileUrlWithBackendUrl = fileURL => {
  return fileURL.startsWith('/') ? `${strapi.backendURL}${fileURL}` : fileURL;
};

export default prefixFileUrlWithBackendUrl;
