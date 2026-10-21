import { file as fileUtils } from '@strapi/utils';
import type { Core, Providers } from '@strapi/types';

import { getProvider } from '../utils';
import type { Config, UploadableFile } from '../types';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async checkFileSize(file: UploadableFile) {
    const { sizeLimit } = strapi.config.get<Config>('plugin::upload');
    await getProvider(strapi).checkFileSize(file, { sizeLimit });
  },

  async upload(file: UploadableFile) {
    const provider = getProvider(strapi);

    if (typeof provider.uploadStream === 'function') {
      file.stream = file.getStream();
      await provider.uploadStream(file);

      delete file.stream;

      if ('filepath' in file) {
        delete file.filepath;
      }
    } else if (typeof provider.upload === 'function') {
      file.buffer = await fileUtils.streamToBuffer(file.getStream());
      await provider.upload(file);

      delete file.buffer;

      if ('filepath' in file) {
        delete file.filepath;
      }
    } else {
      // Unreachable: `createProvider` rejects a provider with neither method
      throw new Error(
        "The upload provider doesn't implement the uploadStream nor the upload method."
      );
    }
  },

  async replace(newFile: UploadableFile, oldFile: Providers.Upload.UploadedFile) {
    const provider = getProvider(strapi);

    if (typeof provider.replaceStream === 'function') {
      newFile.stream = newFile.getStream();
      await provider.replaceStream(newFile, oldFile);

      delete newFile.stream;

      if ('filepath' in newFile) {
        delete newFile.filepath;
      }
      return;
    }

    if (typeof provider.replace === 'function') {
      newFile.buffer = await fileUtils.streamToBuffer(newFile.getStream());
      await provider.replace(newFile, oldFile);

      delete newFile.buffer;

      if ('filepath' in newFile) {
        delete newFile.filepath;
      }
      return;
    }

    // Fallback: delete old then upload new — preserves current behavior for the file.
    await provider.delete(oldFile);
    await this.upload(newFile);
  },
});
