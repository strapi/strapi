import axios from 'axios';
import { AssetSource } from '../constants';
import { typeFromMime } from './typeFromMime';

/**
 * The URL might have query parameters.
 * Remove them to have a clean URL instead to use as a filename.
 */
function cleanUrl(url) {
  // Break URL at ? and take first part (file name, extension)
  url = url.split('?')[0];

  // Sometimes URL doesn't have ? but #
  url = url.split('#')[0];

  // Cleaned URL
  return url;
}

export const urlsToAssets = async urls => {
  const assetPromises = urls.map(url =>
    axios
      .get(url, {
        responseType: 'blob',
        timeout: 60000,
      })
      .then(res => {
        const loadedFile = new File([res.data], cleanUrl(res.config.url), {
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
  const assetsResults = await Promise.all(assetPromises);

  const assets = assetsResults.map(fullFilledAsset => ({
    source: AssetSource.Url,
    name: fullFilledAsset.name,
    type: typeFromMime(fullFilledAsset.mime),
    url: fullFilledAsset.url,
    ext: fullFilledAsset.url.split('.').pop(),
    mime: fullFilledAsset.mime,
    rawFile: fullFilledAsset.rawFile,
  }));

  return assets;
};
