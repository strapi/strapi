const prefixFileUrlWithBackendUrl = (fileURL?: string): string | undefined => {
  return !!fileURL && fileURL.startsWith('/') ? `${window.strapi.backendURL}${fileURL}` : fileURL;
};

export { prefixFileUrlWithBackendUrl };
