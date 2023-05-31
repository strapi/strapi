const ENDPOINT_PATTERN = /^(.+\.)?s3[.-]([a-z0-9-]+)\./;

interface BucketInfo {
  bucket?: string | null;
  err?: string;
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
export function getBucketFromUrl(fileUrl: string): BucketInfo {
  const uri = new URL(fileUrl);

  // S3://<bucket-name>/<key>
  if (uri.protocol === 's3:') {
    const bucket = uri.host;

    if (!bucket) {
      return { err: `Invalid S3 URI: no bucket: ${uri}` };
    }
    return { bucket };
  }

  if (!uri.host) {
    return { err: `Invalid S3 URI: no hostname: ${uri}` };
  }

  const matches = uri.host.match(ENDPOINT_PATTERN);
  if (!matches) {
    return { err: `Invalid S3 URI: hostname does not appear to be a valid S3 endpoint: ${uri}` };
  }

  const prefix = matches[1];
  // https://s3.amazonaws.com/<bucket-name>
  if (!prefix) {
    if (uri.pathname === '/') {
      return { bucket: null };
    }

    const index = uri.pathname.indexOf('/', 1);

    // https://s3.amazonaws.com/<bucket-name>
    if (index === -1) {
      return { bucket: uri.pathname.substring(1) };
    }

    // https://s3.amazonaws.com/<bucket-name>/
    if (index === uri.pathname.length - 1) {
      return { bucket: uri.pathname.substring(1, index) };
    }

    // https://s3.amazonaws.com/<bucket-name>/key
    return { bucket: uri.pathname.substring(1, index) };
  }

  // https://<bucket-name>.s3.amazonaws.com/
  return { bucket: prefix.substring(0, prefix.length - 1) };
}
