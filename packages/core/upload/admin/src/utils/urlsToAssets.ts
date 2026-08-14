import { FileWithRawFile } from '../components/UploadAssetDialog/AddAssetStep/AddAssetStep';

import { resolveFileMime } from './resolveFileMime';
import { typeFromMime } from './typeFromMime';

function getFilenameFromURL(url: string) {
  return new URL(url).pathname.split('/').pop();
}

export const urlsToAssets = async (urls: string[]): Promise<FileWithRawFile[]> => {
  const assetPromises = urls.map((url) =>
    fetch(url).then(async (res) => {
      const blob = await res.blob();

      const loadedFile = new File([blob], getFilenameFromURL(res.url)!, {
        type: res.headers.get('content-type') || undefined,
      });

      return {
        name: loadedFile.name,
        url: res.url,
        mime: res.headers.get('content-type'),
        rawFile: loadedFile,
      };
    })
  );
  // Retrieve the assets metadata
  const assetsResults = await Promise.all(assetPromises);

  const assets = assetsResults.map<FileWithRawFile>((fullFilledAsset) => {
    const mime = resolveFileMime(fullFilledAsset.mime, fullFilledAsset.name);

    return {
      source: 'url' as const,
      name: fullFilledAsset.name,
      type: typeFromMime(mime),
      url: fullFilledAsset.url,
      ext: fullFilledAsset.url.split('.').pop(),
      mime: mime || undefined,
      rawFile: fullFilledAsset.rawFile,
    };
  });

  return assets;
};
