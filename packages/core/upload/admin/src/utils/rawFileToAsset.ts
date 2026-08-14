import { AssetSource } from '../constants';

import { resolveFileMime } from './resolveFileMime';
import { typeFromMime } from './typeFromMime';

import type { RawFile } from '../../../shared/contracts/files';

export const rawFileToAsset = (rawFile: RawFile, assetSource: AssetSource) => {
  const mime = resolveFileMime(rawFile.type, rawFile.name);

  return {
    size: rawFile.size / 1000,
    createdAt: new Date(rawFile.lastModified).toISOString(),
    name: rawFile.name,
    source: assetSource,
    type: typeFromMime(mime),
    url: URL.createObjectURL(rawFile),
    ext: rawFile.name.split('.').pop(),
    mime,
    rawFile,
    isLocal: true,
  };
};
