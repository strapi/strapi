import type { ReadStream } from 'node:fs';
import { getOr } from 'lodash/fp';
import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  HeadObjectCommand,
  PutObjectCommandInput,
  CompleteMultipartUploadCommandOutput,
  AbortMultipartUploadCommandOutput,
  S3ClientConfig,
  ObjectCannedACL,
  ChecksumAlgorithm,
  StorageClass,
  ServerSideEncryption,
} from '@aws-sdk/client-s3';
import type { AwsCredentialIdentity } from '@aws-sdk/types';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { extractCredentials, isUrlFromBucket } from './utils';

/**
 * Supported checksum algorithms for data integrity validation.
 * CRC64NVME is recommended for best performance on modern hardware.
 */
export type SupportedChecksumAlgorithm = 'CRC32' | 'CRC32C' | 'SHA1' | 'SHA256' | 'CRC64NVME';

/**
 * Supported S3 storage classes for cost optimization.
 */
export type SupportedStorageClass =
  | 'STANDARD'
  | 'REDUCED_REDUNDANCY'
  | 'STANDARD_IA'
  | 'ONEZONE_IA'
  | 'INTELLIGENT_TIERING'
  | 'GLACIER'
  | 'DEEP_ARCHIVE'
  | 'GLACIER_IR';

/**
 * Server-side encryption types.
 */
export type EncryptionType = 'AES256' | 'aws:kms' | 'aws:kms:dsse';

/**
 * Encryption configuration for server-side encryption.
 */
export interface EncryptionConfig {
  type: EncryptionType;
  kmsKeyId?: string;
}

/**
 * Multipart upload configuration for large files.
 */
export interface MultipartConfig {
  partSize?: number;
  queueSize?: number;
  leavePartsOnError?: boolean;
}

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
  etag?: string;
}

export type UploadCommandOutput = (
  | CompleteMultipartUploadCommandOutput
  | AbortMultipartUploadCommandOutput
) & {
  Location: string;
  ETag?: string;
};

export interface AWSParams {
  Bucket: string;
  ACL?: ObjectCannedACL;
  signedUrlExpires?: number;
}

/**
 * Extended configuration options for the S3 provider.
 */
export interface ProviderConfig {
  /**
   * Checksum algorithm for data integrity validation during upload.
   * When enabled, the SDK calculates a checksum and S3 validates it server-side.
   */
  checksumAlgorithm?: SupportedChecksumAlgorithm;

  /**
   * When true, uploads will fail if an object with the same key already exists.
   * This prevents accidental overwrites due to race conditions.
   */
  preventOverwrite?: boolean;

  /**
   * S3 storage class for uploaded objects.
   * Use lower-cost classes for infrequently accessed data.
   */
  storageClass?: SupportedStorageClass;

  /**
   * Server-side encryption configuration.
   */
  encryption?: EncryptionConfig;

  /**
   * Tags to apply to uploaded objects.
   * Useful for cost allocation and lifecycle policies.
   */
  tags?: Record<string, string>;

  /**
   * Multipart upload configuration for large files.
   */
  multipart?: MultipartConfig;
}

export interface DefaultOptions extends S3ClientConfig {
  // TODO Remove this in V5
  accessKeyId?: AwsCredentialIdentity['accessKeyId'];
  secretAccessKey?: AwsCredentialIdentity['secretAccessKey'];
  // Keep this for V5
  credentials?: AwsCredentialIdentity;
  params?: AWSParams;
  [k: string]: unknown;
}

export type InitOptions = (DefaultOptions | { s3Options: DefaultOptions }) & {
  baseUrl?: string;
  rootPath?: string;
  providerConfig?: ProviderConfig;
  [k: string]: unknown;
};

/**
 * Validates that a URL uses HTTP or HTTPS protocol.
 * Rejects dangerous protocols like file://, javascript:, data:, etc.
 */
const assertUrlProtocol = (url: string) => {
  return /^https?:\/\//.test(url);
};

/**
 * Sanitizes a path component to prevent path traversal attacks.
 * Removes directory traversal sequences and normalizes the path.
 */
const sanitizePathComponent = (component: string | undefined): string => {
  if (!component) return '';
  return component
    .replace(/\.\./g, '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, '/');
};

/**
 * Maps the provider checksum algorithm to the AWS SDK checksum algorithm.
 */
const mapChecksumAlgorithm = (
  algorithm?: SupportedChecksumAlgorithm
): ChecksumAlgorithm | undefined => {
  if (!algorithm) return undefined;
  const mapping: Record<SupportedChecksumAlgorithm, ChecksumAlgorithm> = {
    CRC32: ChecksumAlgorithm.CRC32,
    CRC32C: ChecksumAlgorithm.CRC32C,
    SHA1: ChecksumAlgorithm.SHA1,
    SHA256: ChecksumAlgorithm.SHA256,
    CRC64NVME: ChecksumAlgorithm.CRC64NVME,
  };
  return mapping[algorithm];
};

/**
 * Maps the provider storage class to the AWS SDK storage class.
 */
const mapStorageClass = (storageClass?: SupportedStorageClass): StorageClass | undefined => {
  if (!storageClass) return undefined;
  const mapping: Record<SupportedStorageClass, StorageClass> = {
    STANDARD: StorageClass.STANDARD,
    REDUCED_REDUNDANCY: StorageClass.REDUCED_REDUNDANCY,
    STANDARD_IA: StorageClass.STANDARD_IA,
    ONEZONE_IA: StorageClass.ONEZONE_IA,
    INTELLIGENT_TIERING: StorageClass.INTELLIGENT_TIERING,
    GLACIER: StorageClass.GLACIER,
    DEEP_ARCHIVE: StorageClass.DEEP_ARCHIVE,
    GLACIER_IR: StorageClass.GLACIER_IR,
  };
  return mapping[storageClass];
};

/**
 * Maps the provider encryption type to the AWS SDK server-side encryption.
 */
const mapServerSideEncryption = (type?: EncryptionType): ServerSideEncryption | undefined => {
  if (!type) return undefined;
  const mapping: Record<EncryptionType, ServerSideEncryption> = {
    AES256: ServerSideEncryption.AES256,
    'aws:kms': ServerSideEncryption.aws_kms,
    'aws:kms:dsse': ServerSideEncryption.aws_kms_dsse,
  };
  return mapping[type];
};

/**
 * Converts a tags object to the S3 Tagging header format.
 * Format: key1=value1&key2=value2
 */
const formatTagsForHeader = (tags?: Record<string, string>): string | undefined => {
  if (!tags || Object.keys(tags).length === 0) return undefined;
  return Object.entries(tags)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
};

/**
 * Checks if the endpoint appears to be a non-AWS S3-compatible provider.
 */
const isNonAwsEndpoint = (endpoint?: string): boolean => {
  if (!endpoint) return false;
  const awsPatterns = [/\.amazonaws\.com$/i, /\.amazonaws\.com\.cn$/i];
  return !awsPatterns.some((pattern) => pattern.test(endpoint));
};

/**
 * Validates provider configuration and emits warnings for potential compatibility issues.
 */
const validateProviderConfig = (
  providerConfig: ProviderConfig | undefined,
  s3Options: DefaultOptions | undefined
): void => {
  if (!providerConfig) return;

  const endpoint = s3Options?.endpoint?.toString() || '';
  const isNonAws = isNonAwsEndpoint(endpoint);

  // Warn about AWS-specific features when using non-AWS endpoints
  if (isNonAws) {
    if (providerConfig.storageClass) {
      process.emitWarning(
        `Storage class '${providerConfig.storageClass}' is AWS S3-specific and may be ignored by your S3-compatible provider.`
      );
    }

    if (providerConfig.encryption?.type && providerConfig.encryption.type !== 'AES256') {
      process.emitWarning(
        `Encryption type '${providerConfig.encryption.type}' is AWS S3-specific. Consider using 'AES256' for better compatibility.`
      );
    }
  }

  // Validate multipart configuration
  if (providerConfig.multipart?.partSize) {
    const minPartSize = 5 * 1024 * 1024; // 5MB
    const maxPartSize = 5 * 1024 * 1024 * 1024; // 5GB

    if (providerConfig.multipart.partSize < minPartSize) {
      process.emitWarning(
        `Multipart partSize ${providerConfig.multipart.partSize} is below the minimum of 5MB. This may cause upload failures.`
      );
    }

    if (providerConfig.multipart.partSize > maxPartSize) {
      process.emitWarning(
        `Multipart partSize ${providerConfig.multipart.partSize} exceeds the maximum of 5GB. This may cause upload failures.`
      );
    }
  }

  if (providerConfig.multipart?.queueSize && providerConfig.multipart.queueSize > 16) {
    process.emitWarning(
      `Multipart queueSize ${providerConfig.multipart.queueSize} is high and may cause memory issues. Consider using 4-8.`
    );
  }
};

const getConfig = ({
  s3Options,
  legacyS3Options,
}: {
  s3Options: DefaultOptions;
  legacyS3Options: Record<string, unknown>;
}) => {
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

  if (config.params !== undefined) {
    // Only set default ACL when ACL is not explicitly present in params.
    // Since April 2023, new AWS S3 buckets have ACLs disabled by default
    // ("Bucket owner enforced"). Sending an ACL header to such buckets
    // throws AccessControlListNotSupported. To disable ACLs, users should
    // simply not include ACL in their params configuration.
    if (!('ACL' in config.params)) {
      config.params.ACL = ObjectCannedACL.public_read;
    }
  } else {
    throw new Error('Upload AWS S3 provider: `params` are required in the config object');
  }

  return config as DefaultOptions & {
    params: AWSParams;
  };
};

export default {
  init({ baseUrl, rootPath, s3Options, providerConfig, ...legacyS3Options }: InitOptions) {
    // Validate configuration and emit warnings for potential issues
    validateProviderConfig(providerConfig, s3Options as DefaultOptions);

    // TODO V5 change config structure to avoid having to do this
    const config = getConfig({ s3Options: s3Options as DefaultOptions, legacyS3Options });
    const s3Client = new S3Client(config);
    const filePrefix = rootPath ? `${rootPath.replace(/\/+$/, '')}/` : '';

    const getFileKey = (file: File) => {
      const sanitizedPath = sanitizePathComponent(file.path);
      const path = sanitizedPath ? `${sanitizedPath}/` : '';
      const sanitizedHash = sanitizePathComponent(file.hash);
      const sanitizedExt = file.ext ? file.ext.replace(/[^a-zA-Z0-9.]/g, '') : '';
      return `${filePrefix}${path}${sanitizedHash}${sanitizedExt}`;
    };

    /**
     * Builds the upload parameters including all configured features.
     */
    const buildUploadParams = (
      file: File,
      fileKey: string,
      customParams: Partial<PutObjectCommandInput> = {}
    ): PutObjectCommandInput => {
      const params: PutObjectCommandInput = {
        Bucket: config.params.Bucket,
        Key: fileKey,
        Body: file.stream || Buffer.from(file.buffer as any, 'binary'),
        // ACL is optional to support providers like Cloudflare R2 that don't support ACLs.
        // Set params.ACL to undefined or omit it entirely to disable ACL headers.
        ...(config.params.ACL ? { ACL: config.params.ACL } : {}),
        ContentType: file.mime,
      };

      // Checksum validation
      const checksumAlgorithm = mapChecksumAlgorithm(providerConfig?.checksumAlgorithm);
      if (checksumAlgorithm) {
        params.ChecksumAlgorithm = checksumAlgorithm;
      }

      // Conditional writes - prevent overwrite
      if (providerConfig?.preventOverwrite) {
        params.IfNoneMatch = '*';
      }

      // Storage class
      const storageClass = mapStorageClass(providerConfig?.storageClass);
      if (storageClass) {
        params.StorageClass = storageClass;
      }

      // Server-side encryption
      if (providerConfig?.encryption) {
        const sse = mapServerSideEncryption(providerConfig.encryption.type);
        if (sse) {
          params.ServerSideEncryption = sse;
          if (providerConfig.encryption.kmsKeyId) {
            params.SSEKMSKeyId = providerConfig.encryption.kmsKeyId;
          }
        }
      }

      // Object tagging
      const tagging = formatTagsForHeader(providerConfig?.tags);
      if (tagging) {
        params.Tagging = tagging;
      }

      // Merge customParams but preserve critical security parameters
      // Bucket, Key, and Body must not be overridden by customParams
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { Bucket, Key, Body, ...safeCustomParams } = customParams as any;
      return { ...params, ...safeCustomParams };
    };

    /**
     * Constructs the correct file URL.
     * Handles S3-compatible providers that return incorrect Location formats.
     */
    const constructFileUrl = (fileKey: string, uploadLocation: string): string => {
      // Priority 1: Use baseUrl if configured (CDN or custom domain)
      if (baseUrl) {
        const cleanBase = baseUrl.replace(/\/+$/, '');
        return `${cleanBase}/${fileKey}`;
      }

      // Priority 2: Construct URL from endpoint if configured
      // This fixes issues with S3-compatible providers (IONOS, MinIO, etc.)
      // that return Location in incorrect format for multipart uploads
      const endpoint = config.endpoint?.toString();
      if (endpoint) {
        const endpointUrl = endpoint.startsWith('http') ? endpoint : `https://${endpoint}`;
        const cleanEndpoint = endpointUrl.replace(/\/+$/, '');
        return `${cleanEndpoint}/${config.params.Bucket}/${fileKey}`;
      }

      // Priority 3: Use the Location from S3 response
      if (assertUrlProtocol(uploadLocation)) {
        return uploadLocation;
      }

      // Priority 4: Prepend https if protocol is missing
      return `https://${uploadLocation}`;
    };

    const upload = async (file: File, customParams: Partial<PutObjectCommandInput> = {}) => {
      const fileKey = getFileKey(file);
      const params = buildUploadParams(file, fileKey, customParams);

      const uploadOptions: {
        client: S3Client;
        params: PutObjectCommandInput;
        partSize?: number;
        queueSize?: number;
        leavePartsOnError?: boolean;
      } = {
        client: s3Client,
        params,
      };

      // Multipart configuration
      if (providerConfig?.multipart) {
        if (providerConfig.multipart.partSize) {
          uploadOptions.partSize = providerConfig.multipart.partSize;
        }
        if (providerConfig.multipart.queueSize) {
          uploadOptions.queueSize = providerConfig.multipart.queueSize;
        }
        if (providerConfig.multipart.leavePartsOnError !== undefined) {
          uploadOptions.leavePartsOnError = providerConfig.multipart.leavePartsOnError;
        }
      }

      const uploadObj = new Upload(uploadOptions);
      const result = (await uploadObj.done()) as UploadCommandOutput;

      // Construct the correct URL (handles S3-compatible provider quirks)
      file.url = constructFileUrl(fileKey, result.Location);

      // Store ETag for potential future conditional updates
      if (result.ETag) {
        file.etag = result.ETag.replace(/"/g, '');
      }
    };

    /**
     * Uploads a file only if the existing object matches the expected ETag.
     * This implements optimistic locking to prevent lost updates.
     */
    const uploadIfMatch = async (
      file: File,
      expectedETag: string,
      customParams: Partial<PutObjectCommandInput> = {}
    ) => {
      const fileKey = getFileKey(file);
      const params = buildUploadParams(file, fileKey, {
        ...customParams,
        IfMatch: expectedETag,
      });

      const uploadObj = new Upload({
        client: s3Client,
        params,
      });

      const result = (await uploadObj.done()) as UploadCommandOutput;

      // Construct the correct URL (handles S3-compatible provider quirks)
      file.url = constructFileUrl(fileKey, result.Location);

      if (result.ETag) {
        file.etag = result.ETag.replace(/"/g, '');
      }
    };

    /**
     * Retrieves metadata for an object including its ETag.
     */
    const getObjectMetadata = async (file: File) => {
      const command = new HeadObjectCommand({
        Bucket: config.params.Bucket,
        Key: getFileKey(file),
      });

      const response = await s3Client.send(command);

      return {
        etag: response.ETag?.replace(/"/g, ''),
        contentLength: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        storageClass: response.StorageClass,
        serverSideEncryption: response.ServerSideEncryption,
      };
    };

    /**
     * Checks if an object exists in the bucket.
     */
    const objectExists = async (file: File): Promise<boolean> => {
      try {
        await getObjectMetadata(file);
        return true;
      } catch (error: any) {
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
          return false;
        }
        throw error;
      }
    };

    return {
      /**
       * Returns whether the bucket is configured with private ACL.
       */
      isPrivate() {
        return config.params.ACL === 'private';
      },

      /**
       * Returns the current provider configuration.
       */
      getProviderConfig(): ProviderConfig | undefined {
        return providerConfig;
      },

      /**
       * Generates a signed URL for accessing a private object.
       */
      async getSignedUrl(file: File, customParams: any): Promise<{ url: string }> {
        if (!isUrlFromBucket(file.url, config.params.Bucket, baseUrl)) {
          return { url: file.url };
        }
        const fileKey = getFileKey(file);

        // Spread customParams first, then override with secure values
        // This prevents malicious override of Bucket and Key
        const url = await getSignedUrl(
          s3Client,
          new GetObjectCommand({
            ...customParams,
            Bucket: config.params.Bucket,
            Key: fileKey,
          }),
          {
            expiresIn: getOr(15 * 60, ['params', 'signedUrlExpires'], config),
          }
        );

        return { url };
      },

      /**
       * Uploads a file using streaming.
       */
      uploadStream(file: File, customParams = {}) {
        return upload(file, customParams);
      },

      /**
       * Uploads a file to S3.
       */
      upload(file: File, customParams = {}) {
        return upload(file, customParams);
      },

      /**
       * Uploads a file only if it matches the expected ETag (optimistic locking).
       * Throws PreconditionFailed error if ETag does not match.
       */
      uploadIfMatch(file: File, expectedETag: string, customParams = {}) {
        return uploadIfMatch(file, expectedETag, customParams);
      },

      /**
       * Retrieves object metadata including ETag.
       */
      getObjectMetadata(file: File) {
        return getObjectMetadata(file);
      },

      /**
       * Checks if an object exists in the bucket.
       */
      objectExists(file: File) {
        return objectExists(file);
      },

      /**
       * Deletes an object from S3.
       */
      delete(file: File, customParams = {}): Promise<DeleteObjectCommandOutput> {
        // Spread customParams first, then override with secure values
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { Bucket, Key, ...safeParams } = customParams as any;
        const command = new DeleteObjectCommand({
          ...safeParams,
          Bucket: config.params.Bucket,
          Key: getFileKey(file),
        });
        return s3Client.send(command);
      },
    };
  },
};
