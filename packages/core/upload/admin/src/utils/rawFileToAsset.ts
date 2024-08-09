import { typeFromMime } from './typeFromMime';
// TODO: import this file from the constants file when it will be migrated to TS
import { AssetSource } from '../newConstants';

import type { RawFile } from '../types';

export const rawFileToAsset = (rawFile: RawFile, assetSource: AssetSource) => {
  return {
    size: rawFile.size / 1000,
    createdAt: new Date(rawFile.lastModified).toISOString(),
    name: rawFile.name,
    source: assetSource,
    type: typeFromMime(rawFile.type),
    url: URL.createObjectURL(rawFile),
    ext: rawFile.name.split('.').pop(),
    mime: rawFile.type,
    rawFile,
    isLocal: true,
  };
};
