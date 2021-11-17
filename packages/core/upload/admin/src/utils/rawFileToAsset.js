import { typeFromMime } from './typeFromMime';

export const rawFileToAsset = (rawFile, assetSource) => {
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
