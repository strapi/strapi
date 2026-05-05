import type { AwsCredentialIdentity } from '@aws-sdk/types';
import type { DefaultOptions, InitOptions } from '.';

const ENDPOINT_PATTERN = /^(.+\.)?s3[.-]([a-z0-9-]+)\./;

interface BucketInfo {
  bucket?: string | null;
  err?: string;
}

export function isUrlFromBucket(fileUrl: string, bucketName: string, baseUrl = ''): boolean {
  try {
    const url = new URL(fileUrl);

    if (baseUrl) {
      return false;
    }

    const { bucket } = getBucketFromAwsUrl(fileUrl);

    if (bucket) {
      return bucket === bucketName;
    }

    return url.host.startsWith(`${bucketName}.`) || url.pathname.includes(`/${bucketName}/`);
  } catch {
    return false;
  }
}

/**
 * Parse the bucket name from a URL.
 * See all URL formats in https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-bucket-intro.html
 *
 * @param {string} fileUrl - the URL to parse
 * @returns {object} result
 * @returns {string} result.bucket - the bucket name
 * @returns {string} result.err - if any
 */
function getBucketFromAwsUrl(fileUrl: string): BucketInfo {
  const url = new URL(fileUrl);

  // S3://<bucket-name>/<key>
  if (url.protocol === 's3:') {
    const bucket = url.host;

    if (!bucket) {
      return { err: `Invalid S3 url: no bucket: ${url}` };
    }
    return { bucket };
  }

  if (!url.host) {
    return { err: `Invalid S3 url: no hostname: ${url}` };
  }

  const matches = url.host.match(ENDPOINT_PATTERN);
  if (!matches) {
    return { err: `Invalid S3 url: hostname does not appear to be a valid S3 endpoint: ${url}` };
  }

  const prefix = matches[1];
  // https://s3.amazonaws.com/<bucket-name>
  if (!prefix) {
    if (url.pathname === '/') {
      return { bucket: null };
    }

    const index = url.pathname.indexOf('/', 1);

    // https://s3.amazonaws.com/<bucket-name>
    if (index === -1) {
      return { bucket: url.pathname.substring(1) };
    }

    // https://s3.amazonaws.com/<bucket-name>/
    if (index === url.pathname.length - 1) {
      return { bucket: url.pathname.substring(1, index) };
    }

    // https://s3.amazonaws.com/<bucket-name>/key
    return { bucket: url.pathname.substring(1, index) };
  }

  // https://<bucket-name>.s3.amazonaws.com/
  return { bucket: prefix.substring(0, prefix.length - 1) };
}

export const extractCredentials = (options: InitOptions): AwsCredentialIdentity | null => {
  const s3Options = (options as { s3Options?: DefaultOptions }).s3Options;

  if (s3Options?.credentials) {
    return {
      accessKeyId: s3Options.credentials.accessKeyId,
      secretAccessKey: s3Options.credentials.secretAccessKey,
      ...(s3Options.credentials.sessionToken
        ? { sessionToken: s3Options.credentials.sessionToken }
        : {}),
    };
  }

  // Support root-level accessKeyId/secretAccessKey in s3Options for backwards
  // compatibility. AWS SDK v3 requires these inside a `credentials` object;
  // passing them at the top level silently fails (Access Denied).
  if (s3Options?.accessKeyId && s3Options?.secretAccessKey) {
    console.warn(
      "[upload-aws-s3] Passing 'accessKeyId' and 'secretAccessKey' directly in s3Options is deprecated. " +
        "Please wrap them in a 'credentials' object: s3Options: { credentials: { accessKeyId, secretAccessKey } }."
    );
    return {
      accessKeyId: s3Options.accessKeyId,
      secretAccessKey: s3Options.secretAccessKey,
    };
  }

  return null;
};
