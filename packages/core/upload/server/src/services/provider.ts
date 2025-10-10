import { isFunction } from 'lodash/fp';
import { file as fileUtils } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { Config, UploadableFile } from '../types';

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
});
