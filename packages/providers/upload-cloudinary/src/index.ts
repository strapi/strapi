import type { ReadStream } from 'node:fs';
import { v2 as cloudinary, ConfigOptions, UploadApiOptions } from 'cloudinary';
import intoStream from 'into-stream';
import * as utils from '@strapi/utils';

interface File {
  name: string;
  alternativeText?: string;
  caption?: string;
  width?: number;
  height?: number;
  formats?: Record<string, unknown>;
  hash: string;
  ext?: string;
  mime: string;
  size: number;
  url: string;
  previewUrl?: string;
  path?: string;
  provider?: string;
  provider_metadata?: Record<string, unknown>;
  stream?: ReadStream;
  buffer?: Buffer;
}

export = {
  init(options: ConfigOptions) {
    cloudinary.config(options);

    const upload = (file: File, customConfig = {}): Promise<void> => {
      return new Promise((resolve, reject) => {
        const config: Partial<UploadApiOptions> = {
          resource_type: 'auto',
          public_id: file.hash,
        };

        if (file.ext) {
          config.filename = `${file.hash}${file.ext}`;
        }

        if (file.path) {
          config.folder = file.path;
        }

        // For files smaller than 99 MB use regular upload as it tends to be faster
        // and fallback to chunked upload for larger files as that's required by Cloudinary.
        // https://support.cloudinary.com/hc/en-us/community/posts/360009586100-Upload-movie-video-with-large-size?page=1#community_comment_360002140099
        // The Cloudinary's max limit for regular upload is actually 100 MB but add some headroom
        // for size counting shenanigans. (Strapi provides the size in kilobytes rounded to two decimal places here).
        const uploadMethod =
          file.size && file.size < 1000 * 99
            ? cloudinary.uploader.upload_stream
            : cloudinary.uploader.upload_chunked_stream;

        const uploadStream = uploadMethod({ ...config, ...customConfig }, (err, image) => {
          if (err) {
            if (err.message.includes('File size too large')) {
              reject(new utils.errors.PayloadTooLargeError());
            } else {
              reject(new Error(`Error uploading to cloudinary: ${err.message}`));
            }
            return;
          }

          if (!image) {
            return;
          }

          if (image.resource_type === 'video') {
            file.previewUrl = cloudinary.url(`${image.public_id}.gif`, {
              video_sampling: 6,
              delay: 200,
              width: 250,
              crop: 'scale',
              resource_type: 'video',
            });
          }

          file.url = image.secure_url;
          file.provider_metadata = {
            public_id: image.public_id,
            resource_type: image.resource_type,
          };

          resolve();
        });

        if (file.stream) {
          file.stream.pipe(uploadStream);
        } else if (file.buffer) {
          intoStream(file.buffer).pipe(uploadStream);
        } else {
          throw new Error('Missing file stream or buffer');
        }
      });
    };

    return {
      uploadStream(file: File, customConfig = {}) {
        return upload(file, customConfig);
      },
      upload(file: File, customConfig = {}) {
        return upload(file, customConfig);
      },
      async delete(file: File, customConfig = {}) {
        try {
          const { resource_type: resourceType, public_id: publicId } = file.provider_metadata ?? {};
          const deleteConfig = {
            resource_type: (resourceType || 'image') as string,
            invalidate: true,
            ...customConfig,
          };

          const response = await cloudinary.uploader.destroy(`${publicId}`, deleteConfig);

          if (response.result !== 'ok' && response.result !== 'not found') {
            throw new Error(response.result);
          }
        } catch (error) {
          if (error instanceof Error) {
            throw new Error(`Error deleting on cloudinary: ${error.message}`);
          }

          throw error;
        }
      },
    };
  },
};
