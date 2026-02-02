import { prefixFileUrlWithBackendUrl } from './prefixFileUrlWithBackendUrl';

import type { File } from '../../../shared/contracts/files';

export const createAssetUrl = (asset: File, forThumbnail = true) => {
  if (asset.isLocal) {
    return asset.url;
  }

  const assetUrl = forThumbnail ? asset?.formats?.thumbnail?.url || asset.url : asset.url;

  return prefixFileUrlWithBackendUrl(assetUrl);
};
