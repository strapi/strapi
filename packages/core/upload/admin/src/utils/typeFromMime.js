import { AssetType } from '../constants';

export const typeFromMime = mime => {
  if (mime.includes(AssetType.Image)) {
    return AssetType.Image;
  }
  if (mime.includes(AssetType.Video)) {
    return AssetType.Video;
  }

  return AssetType.Document;
};
