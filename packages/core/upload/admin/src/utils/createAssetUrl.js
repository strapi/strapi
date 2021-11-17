import { prefixFileUrlWithBackendUrl } from '@strapi/helper-plugin';

export const createAssetUrl = asset => {
  if (asset.isLocal) {
    return asset.url;
  }

  const assetUrl = asset?.formats?.thumbnail?.url || asset.url;
  const backendUrl = prefixFileUrlWithBackendUrl(assetUrl);

  return `${backendUrl}?updated_at=${asset.updatedAt}`;
};
