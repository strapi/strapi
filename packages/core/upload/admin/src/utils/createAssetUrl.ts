import { prefixFileUrlWithBackendUrl } from './prefixFileUrlWithBackendUrl';
import type { Asset } from '../../../shared/contracts/files';

interface AssetProps extends Asset {
  type?: string;
  isSelectable?: boolean;
  isLocal?: boolean;
}

export const createAssetUrl = (asset: AssetProps, forThumbnail = true) => {
  if (asset.isLocal) {
    return asset.url;
  }

  const assetUrl = forThumbnail ? asset?.formats?.thumbnail?.url || asset.url : asset.url;

  return prefixFileUrlWithBackendUrl(assetUrl);
};
