import { typeFromMime } from './typeFromMime';

export const rawFileToAsset = (rawFile, assetSource) => {
  return {
    name: rawFile.name,
    source: assetSource,
    type: typeFromMime(rawFile.type),
    url: URL.createObjectURL(rawFile),
    ext: rawFile.name.split('.').pop(),
    mime: rawFile.type,
    rawFile,
  };
};
