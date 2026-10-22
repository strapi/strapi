import { file as fileUtils } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { Config, File, UploadableFile } from '../types';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Passes the file and the configured `sizeLimit` to the provider's own size check.
   *
   * @internal
   */
  async checkFileSize(file: UploadableFile) {
    const { sizeLimit } = strapi.config.get<Config>('plugin::upload');
    await strapi.plugin('upload').provider.checkFileSize(file, { sizeLimit });
  },

  /**
   * Sends the file to the provider, as a stream when the provider supports it, as a buffer
   * otherwise. The provider sets the file's `url`.
   *
   * @internal
   */
  async upload(file: UploadableFile) {
    if (typeof strapi.plugin('upload').provider.uploadStream === 'function') {
      file.stream = file.getStream();
      await strapi.plugin('upload').provider.uploadStream(file);

      delete file.stream;

      if ('filepath' in file) {
        delete file.filepath;
      }
    } else {
      file.buffer = await fileUtils.streamToBuffer(file.getStream());
      await strapi.plugin('upload').provider.upload(file);

      delete file.buffer;

      if ('filepath' in file) {
        delete file.filepath;
      }
    }
  },

  /**
   * Replaces the old file with the new one at the provider. A provider without `replace` gets a
   * delete of the old file, then an upload of the new one.
   *
   * @internal
   */
  async replace(newFile: UploadableFile, oldFile: File) {
    const provider = strapi.plugin('upload').provider;

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
