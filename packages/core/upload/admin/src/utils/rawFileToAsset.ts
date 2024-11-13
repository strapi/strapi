import { AssetSource } from '../constants';

import { typeFromMime } from './typeFromMime';

import type { RawFile } from '../../../shared/contracts/files';

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
