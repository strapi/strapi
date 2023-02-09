import { prefixFileUrlWithBackendUrl } from '@strapi/helper-plugin';

/**
 * Create image URL for asset
 * @param {Object} asset
 * @param {Boolean} forThumbnail - if true, return URL for thumbnail
 * if there's no thumbnail, return the URL of the original image.
 * @return {String} URL
 */
const createAssetUrl = (asset, forThumbnail = true) => {
  if (asset.isLocal) {
    return asset.url;
  }

  const assetUrl = forThumbnail ? asset?.formats?.thumbnail?.url || asset.url : asset.url;
  const backendUrl = new URL(prefixFileUrlWithBackendUrl(assetUrl));

  // TODO: This gives problems with presigned URLs
  // backendUrl.searchParams.set('updated_at', asset.updatedAt);

  return backendUrl.toString();
};

export default createAssetUrl;
