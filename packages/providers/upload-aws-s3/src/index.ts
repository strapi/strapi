import type { ReadStream } from 'node:fs';
import { getOr } from 'lodash/fp';
import AWS from 'aws-sdk';
import { getBucketFromUrl } from './utils';

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

// TODO V5: Migrate to aws-sdk v3
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('aws-sdk/lib/maintenance_mode_message').suppress = true;

function hasUrlProtocol(url: string) {
  // Regex to test protocol like "http://", "https://"
  return /^\w*:\/\//.test(url);
}

interface InitOptions extends Partial<AWS.S3.ClientConfiguration> {
  baseUrl?: string;
  rootPath?: string;
  s3Options: AWS.S3.ClientConfiguration & {
    params: {
      Bucket: string; // making it required
      ACL?: string;
      signedUrlExpires?: string;
    };
  };
}

export = {
  init({ baseUrl, rootPath, s3Options, ...legacyS3Options }: InitOptions) {
    if (Object.keys(legacyS3Options).length > 0) {
      process.emitWarning(
        "S3 configuration options passed at root level of the plugin's providerOptions is deprecated and will be removed in a future release. Please wrap them inside the 's3Options:{}' property."
      );
    }

    const config = { ...s3Options, ...legacyS3Options };

    const S3 = new AWS.S3({
      apiVersion: '2006-03-01',
      ...config,
    });

    const filePrefix = rootPath ? `${rootPath.replace(/\/+$/, '')}/` : '';

    const getFileKey = (file: File) => {
      const path = file.path ? `${file.path}/` : '';

      return `${filePrefix}${path}${file.hash}${file.ext}`;
    };

    const ACL = getOr('public-read', ['params', 'ACL'], config);

    const upload = (file: File, customParams = {}): Promise<void> =>
      new Promise((resolve, reject) => {
        const fileKey = getFileKey(file);

        if (!file.stream && !file.buffer) {
          reject(new Error('Missing file stream or buffer'));
          return;
        }

        const params = {
          Key: fileKey,
          Bucket: config.params.Bucket,
          Body: file.stream || file.buffer,
          ACL,
          ContentType: file.mime,
          ...customParams,
        };

        const onUploaded = (err: Error, data: AWS.S3.ManagedUpload.SendData) => {
          if (err) {
            return reject(err);
          }

          // set the bucket file url
          if (baseUrl) {
            // Construct the url with the baseUrl
            file.url = `${baseUrl}/${fileKey}`;
          } else {
            // Add the protocol if it is missing
            // Some providers like DigitalOcean Spaces return the url without the protocol
            file.url = hasUrlProtocol(data.Location) ? data.Location : `https://${data.Location}`;
          }
          resolve();
        };

        S3.upload(params, onUploaded);
      });

    return {
      isPrivate() {
        return ACL === 'private';
      },
      async getSignedUrl(file: File): Promise<{ url: string }> {
        // Do not sign the url if it does not come from the same bucket.
        const { bucket } = getBucketFromUrl(file.url);
        if (bucket !== config.params.Bucket) {
          return { url: file.url };
        }

        return new Promise((resolve, reject) => {
          const fileKey = getFileKey(file);

          S3.getSignedUrl(
            'getObject',
            {
              Bucket: config.params.Bucket,
              Key: fileKey,
              Expires: getOr(15 * 60, ['params', 'signedUrlExpires'], config), // 15 minutes
            },
            (err, url) => {
              if (err) {
                return reject(err);
              }
              resolve({ url });
            }
          );
        });
      },
      uploadStream(file: File, customParams = {}) {
        return upload(file, customParams);
      },
      upload(file: File, customParams = {}) {
        return upload(file, customParams);
      },
      delete(file: File, customParams = {}): Promise<void> {
        return new Promise((resolve, reject) => {
          // delete file on S3 bucket
          const fileKey = getFileKey(file);
          S3.deleteObject(
            {
              Key: fileKey,
              Bucket: config.params.Bucket,
              ...customParams,
            },
            (err) => {
              if (err) {
                return reject(err);
              }

              resolve();
            }
          );
        });
      },
    };
  },
};
