import type { ReadStream } from 'node:fs';
import { v2 as cloudinary, ConfigOptions, UploadApiOptions } from 'cloudinary';
import intoStream from 'into-stream';
import * as utils from '@strapi/utils';
import type { Providers } from '@strapi/types';

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
  sizeInBytes: number;
  url: string;
  previewUrl?: string;
  path?: string;
  provider?: string;
  provider_metadata?: Record<string, unknown>;
  stream?: ReadStream;
  buffer?: Buffer;
}

const providerModule = {
  init(options: ConfigOptions) {
    cloudinary.config(options);

    // `pinnedConfig` comes after the caller options, so they cannot override it. A `folder: undefined`
    // there removes the folder, which also drops a folder set from `file.path`.
    const upload = (
      file: File,
      customConfig = {},
      pinnedConfig: Partial<UploadApiOptions> = {}
    ): Promise<void> => {
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

        const uploadConfig: Partial<UploadApiOptions> = {
          ...config,
          ...customConfig,
          ...pinnedConfig,
        };
        if ('folder' in pinnedConfig && pinnedConfig.folder === undefined) {
          delete uploadConfig.folder;
        }

        const uploadStream = uploadMethod(uploadConfig, (err, image) => {
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

    const replace = async (newFile: File, oldFile: File, customConfig = {}): Promise<void> => {
      const { public_id: oldPublicId, resource_type: oldResourceType } =
        oldFile.provider_metadata ?? {};

      // A replace must overwrite the bytes and invalidate the CDN cache wherever the new asset
      // lands, including on the old public_id through options such as `folder`, where the old
      // asset is not destroyed below. These flags come after the options so they cannot be
      // overridden.
      const replaceConfig = { overwrite: true, invalidate: true };

      // If the public_id is preserved, overwrite in place. `public_id` comes after the options so
      // it cannot be overridden, and `folder` (from the options or `file.path`) is dropped, so the
      // asset never moves. A move would destroy the old asset below before the upload plugin
      // updates the file row, and a failed sibling format replace would then leave the row on a
      // destroyed asset. On the other branch `resource_type` stays `auto`, so a type change makes
      // the new asset a different one and the old asset is destroyed below.
      if (oldPublicId && newFile.hash === oldPublicId) {
        await upload(
          newFile,
          {
            ...(oldResourceType ? { resource_type: oldResourceType } : {}),
            ...customConfig,
          },
          { public_id: oldPublicId as string, folder: undefined, ...replaceConfig }
        );
      } else {
        await upload(newFile, customConfig, replaceConfig);
      }

      // Cloudinary identifies an asset by its public_id and resource_type together. Options such
      // as `folder` prefix the public_id (`folder/hash`), and a new mime can change the
      // resource_type, so the new asset can land on the old one or next to it. Destroy the old
      // asset only when it is a different one, or the new asset would be deleted.
      const { public_id: newPublicId, resource_type: newResourceType } =
        newFile.provider_metadata ?? {};
      const oldAssetResourceType = oldResourceType || 'image';
      if (
        oldPublicId &&
        (newPublicId !== oldPublicId || newResourceType !== oldAssetResourceType)
      ) {
        try {
          await cloudinary.uploader.destroy(`${oldPublicId}`, {
            resource_type: oldAssetResourceType as string,
            invalidate: true,
          });
        } catch (error) {
          if (error instanceof Error) {
            throw new Error(`Error deleting on cloudinary: ${error.message}`);
          }
          throw error;
        }
      }
    };

    return {
      uploadStream(file: File, customConfig = {}) {
        return upload(file, customConfig);
      },
      upload(file: File, customConfig = {}) {
        return upload(file, customConfig);
      },
      replaceStream(newFile: File, oldFile: File, customConfig = {}) {
        return replace(newFile, oldFile, customConfig);
      },
      replace(newFile: File, oldFile: File, customConfig = {}) {
        return replace(newFile, oldFile, customConfig);
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

// Checked apart from its declaration, so the contract does not re-type the parameters the
// provider leaves to inference.
providerModule satisfies Providers.Upload.Factory<ConfigOptions>;

export default providerModule;
