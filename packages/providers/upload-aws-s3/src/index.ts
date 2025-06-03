import type { ReadStream } from 'node:fs';
import { getOr } from 'lodash/fp';
import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  PutObjectCommandInput,
  CompleteMultipartUploadCommandOutput,
  AbortMultipartUploadCommandOutput,
  S3ClientConfig,
  ObjectCannedACL,
} from '@aws-sdk/client-s3';
import type { AwsCredentialIdentity } from '@aws-sdk/types';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { extractCredentials, isUrlFromBucket } from './utils';

export interface File {
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

export type UploadCommandOutput = (
  | CompleteMultipartUploadCommandOutput
  | AbortMultipartUploadCommandOutput
) & {
  Location: string;
};

export interface AWSParams {
  Bucket: string; // making it required
  ACL?: ObjectCannedACL;
  signedUrlExpires?: number;
}

export interface DefaultOptions extends S3ClientConfig {
  // TODO Remove this in V5
  accessKeyId?: AwsCredentialIdentity['accessKeyId'];
  secretAccessKey?: AwsCredentialIdentity['secretAccessKey'];
  // Keep this for V5
  credentials?: AwsCredentialIdentity;
  params?: AWSParams;
  [k: string]: any;
}

export type InitOptions = (DefaultOptions | { s3Options: DefaultOptions }) & {
  baseUrl?: string;
  rootPath?: string;
  [k: string]: any;
};

const assertUrlProtocol = (url: string) => {
  // Regex to test protocol like "http://", "https://"
  return /^\w*:\/\//.test(url);
};

const getConfig = ({ baseUrl, rootPath, s3Options, ...legacyS3Options }: InitOptions) => {
  if (Object.keys(legacyS3Options).length > 0) {
    process.emitWarning(
      "S3 configuration options passed at root level of the plugin's providerOptions is deprecated and will be removed in a future release. Please wrap them inside the 's3Options:{}' property."
    );
  }
  const credentials = extractCredentials({ s3Options, ...legacyS3Options });
  const config = {
    ...s3Options,
    ...legacyS3Options,
    ...(credentials ? { credentials } : {}),
  };

  config.params.ACL = getOr(ObjectCannedACL.public_read, ['params', 'ACL'], config);

  return config;
};

export default {
  init({ baseUrl, rootPath, s3Options, ...legacyS3Options }: InitOptions) {
    // TODO V5 change config structure to avoid having to do this
    const config = getConfig({ baseUrl, rootPath, s3Options, ...legacyS3Options });
    const s3Client = new S3Client(config);
    const filePrefix = rootPath ? `${rootPath.replace(/\/+$/, '')}/` : '';

    const getFileKey = (file: File) => {
      const path = file.path ? `${file.path}/` : '';
      return `${filePrefix}${path}${file.hash}${file.ext}`;
    };

    const upload = async (file: File, customParams: Partial<PutObjectCommandInput> = {}) => {
      const fileKey = getFileKey(file);
      const uploadObj = new Upload({
        client: s3Client,
        params: {
          Bucket: config.params.Bucket,
          Key: fileKey,
          Body: file.stream || Buffer.from(file.buffer as any, 'binary'),
          ACL: config.params.ACL,
          ContentType: file.mime,
          ...customParams,
        },
      });

      const upload = (await uploadObj.done()) as UploadCommandOutput;

      if (assertUrlProtocol(upload.Location)) {
        file.url = baseUrl ? `${baseUrl}/${fileKey}` : upload.Location;
      } else {
        // Default protocol to https protocol
        file.url = `https://${upload.Location}`;
      }
    };

    return {
      isPrivate() {
        return config.params.ACL === 'private';
      },

      async getSignedUrl(file: File, customParams: any): Promise<{ url: string }> {
        // Do not sign the url if it does not come from the same bucket.
        if (!isUrlFromBucket(file.url, config.params.Bucket, baseUrl)) {
          return { url: file.url };
        }
        const fileKey = getFileKey(file);

        const url = await getSignedUrl(
          // @ts-expect-error - TODO fix client type
          s3Client,
          new GetObjectCommand({
            Bucket: config.params.Bucket,
            Key: fileKey,
            ...customParams,
          }),
          {
            expiresIn: getOr(15 * 60, ['params', 'signedUrlExpires'], config),
          }
        );

        return { url };
      },
      uploadStream(file: File, customParams = {}) {
        return upload(file, customParams);
      },
      upload(file: File, customParams = {}) {
        return upload(file, customParams);
      },
      delete(file: File, customParams = {}): Promise<DeleteObjectCommandOutput> {
        const command = new DeleteObjectCommand({
          Bucket: config.params.Bucket,
          Key: getFileKey(file),
          ...customParams,
        });
        return s3Client.send(command);
      },
    };
  },
};
