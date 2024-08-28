import { prefixFileUrlWithBackendUrl } from './prefixFileUrlWithBackendUrl';
import type { AssetEnriched } from '../../../shared/contracts/files';

export const createAssetUrl = (asset: AssetEnriched, forThumbnail = true) => {
  if (asset.isLocal) {
    return asset.url;
  }

  const assetUrl = forThumbnail ? asset?.formats?.thumbnail?.url || asset.url : asset.url;

  return prefixFileUrlWithBackendUrl(assetUrl);
};
