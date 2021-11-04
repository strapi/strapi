import { prefixFileUrlWithBackendUrl } from '@strapi/helper-plugin';

export const createAssetUrl = asset => {
  const assetUrl = asset?.formats?.thumbnail?.url || asset.url;
  const backendUrl = prefixFileUrlWithBackendUrl(assetUrl);

  return `${backendUrl}?updated_at=${asset.updatedAt}`;
};
