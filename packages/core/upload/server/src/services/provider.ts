import fp from 'lodash/fp.js';
import { file as fileUtils } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { Config, File, UploadableFile } from '../types';

const { isFunction } = fp;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async checkFileSize(file: UploadableFile) {
    const { sizeLimit } = strapi.config.get<Config>('plugin::upload');
    await strapi.plugin('upload').provider.checkFileSize(file, { sizeLimit });
  },

  async upload(file: UploadableFile) {
    if (isFunction(strapi.plugin('upload').provider.uploadStream)) {
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

  async replace(newFile: UploadableFile, oldFile: File) {
    const provider = strapi.plugin('upload').provider;

    if (isFunction(provider.replaceStream)) {
      newFile.stream = newFile.getStream();
      await provider.replaceStream(newFile, oldFile);

      delete newFile.stream;

      if ('filepath' in newFile) {
        delete newFile.filepath;
      }
      return;
    }

    if (isFunction(provider.replace)) {
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
