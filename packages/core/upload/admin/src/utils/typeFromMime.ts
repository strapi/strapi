// TODO: replace this import with the import from constants file when it will be migrated to TS
import { AssetType } from '../newConstants';

export const typeFromMime = (mime: string) => {
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
