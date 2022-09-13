import { AssetType } from '../constants';

export const typeFromMime = (mime) => {
  if (mime.includes(AssetType.Image)) {
    return AssetType.Image;
  }
  if (mime.includes(AssetType.Video)) {
    return AssetType.Video;
  }
  if (mime.includes(AssetType.Audio)) {
    return AssetType.Audio;
  }

  return AssetType.Document;
};
