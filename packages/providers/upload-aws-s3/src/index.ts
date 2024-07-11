import type { ReadStream } from 'node:fs';
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
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { isUrlFromBucket } from './utils';

export type File = {
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

export type AWSParams = {
  Bucket: string;
  ACL?: ObjectCannedACL;
  signedUrlExpires?: number;
}

export type InitOptions = {
  s3Options: S3ClientConfig & { params: AWSParams },
  baseUrl?: string;
  rootPath?: string;
  [k: string]: any;
};

const assertUrlProtocol = (url: string) => {
  // Regex to test protocol like "http://", "https://"
  return /^\w*:\/\//.test(url);
};

export default {
  init({ baseUrl, rootPath, s3Options }: InitOptions) {
    const config = s3Options;
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
          Body: file.stream ?? Buffer.from(file.buffer as any, 'binary'),
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
            expiresIn: config?.params.signedUrlExpires ?? 15 * 60,
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
