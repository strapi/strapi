import type { ReadStream } from 'node:fs';
import { v2 as cloudinary, ConfigOptions, UploadApiOptions } from 'cloudinary';
import intoStream from 'into-stream';
import utils from '@strapi/utils';

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

        const uploadStream = cloudinary.uploader.upload_stream(
          { ...config, ...customConfig },
          (err, image) => {
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
          }
        );

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
