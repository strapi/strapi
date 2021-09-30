import axios from 'axios';
import { AssetType, AssetSource } from '../constants';
import { typeFromMime } from './typeFromMime';

export const urlsToAssets = async urls => {
  const assetPromises = urls.map(url =>
    axios
      .get(url, {
        responseType: 'blob',
        timeout: 60000,
      })
      .then(res => {
        const loadedFile = new File([res.data], res.config.url, {
          type: res.headers['content-type'],
        });

        return {
          name: loadedFile.name,
          url: res.config.url,
          mime: res.headers['content-type'],
          rawFile: loadedFile,
        };
      })
  );
  // Retrieve the assets metadata
  const assetsResults = await Promise.allSettled(assetPromises);

  // Separate the fullfilled from the rejected promises
  const fullFilledAssets = assetsResults.filter(asset => asset.status === 'fulfilled');
  const rejectedAssets = assetsResults.filter(asset => asset.status === 'rejected');

  const assets = fullFilledAssets.map(fullFilledAsset => ({
    source: AssetSource.Url,
    name: fullFilledAsset.value.name,
    type: typeFromMime(fullFilledAsset.value.mime),
    url: fullFilledAsset.value.url,
    ext: fullFilledAsset.value.url.split('.').pop(),
    mime: fullFilledAsset.value.mime,
    rawFile: fullFilledAsset.value.rawFile,
  }));

  const unknownAssets = rejectedAssets.map(unknownAsset => ({
    source: AssetSource.Url,
    name: unknownAsset.reason,
    type: AssetType.Unknown,
    url: unknownAsset.reason,
    ext: unknownAsset.reason.split('.').pop(),
    mime: undefined,
  }));

  return assets.concat(unknownAssets);
};
