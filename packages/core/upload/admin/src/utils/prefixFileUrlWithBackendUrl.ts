export const prefixFileUrlWithBackendUrl = (fileURL?: string) => {
  // TODO: to remove when the admin index.js is migrated to TS
  // @ts-ignore
  return !!fileURL && fileURL.startsWith('/') ? `${window.strapi.backendURL}${fileURL}` : fileURL;
};
