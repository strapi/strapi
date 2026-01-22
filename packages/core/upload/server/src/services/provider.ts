import { isFunction } from 'lodash/fp';
import { Readable } from 'stream';
import { file as fileUtils } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { Config, UploadableFile } from '../types';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async checkFileSize(file: UploadableFile) {
    const { sizeLimit } = strapi.config.get<Config>('plugin::upload');
    await strapi.plugin('upload').provider.checkFileSize(file, { sizeLimit });
  },

  async upload(file: UploadableFile) {
    const uploadProvider = strapi.plugin('upload').provider;

    if (isFunction(uploadProvider.uploadStream)) {
      const stream = file.getStream();
      file.stream = stream;

      try {
        await uploadProvider.uploadStream(file);
      } finally {
        delete file.stream;

        // Explicitly destroy stream to prevent memory leak
        const streamWithDestroy = stream as unknown as Readable;
        if (stream && !streamWithDestroy.destroyed) {
          streamWithDestroy.destroy();
        }

        if ('filepath' in file) {
          delete file.filepath;
        }
      }
    } else {
      const stream = file.getStream();

      try {
        file.buffer = await fileUtils.streamToBuffer(stream);
        await uploadProvider.upload(file);
      } finally {
        delete file.buffer;

        // Destroy stream even though streamToBuffer consumes it
        const streamWithDestroy = stream as unknown as Readable;
        if (stream && !streamWithDestroy.destroyed) {
          streamWithDestroy.destroy();
        }

        if ('filepath' in file) {
          delete file.filepath;
        }
      }
    }
  },
});
