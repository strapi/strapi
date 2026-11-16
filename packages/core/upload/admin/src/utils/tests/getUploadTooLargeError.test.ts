import { UploadFileError } from '../../services/uploadFileViaXHR';
import { formatSizeLimit, getUploadTooLargeError } from '../getUploadTooLargeError';

describe('getUploadTooLargeError', () => {
  it('reads a body parser rejection from the Strapi error details', () => {
    expect(
      getUploadTooLargeError({
        status: 413,
        name: 'PayloadTooLargeError',
        message: 'FileTooBig',
        details: { code: 'FileTooBig', limit: 209715200 },
      })
    ).toEqual({ reason: 'requestLimit', limit: 209715200 });
  });

  it('reads an upload plugin rejection from the Strapi error details', () => {
    expect(
      getUploadTooLargeError({
        status: 413,
        name: 'PayloadTooLargeError',
        message: 'big.png exceeds size limit of 200 MB.',
        details: { code: 'SizeLimitExceeded', limit: 200000000 },
      })
    ).toEqual({ reason: 'sizeLimit', limit: 200000000 });
  });

  it('reads the details of an XHR upload error', () => {
    const error = new UploadFileError('FileTooBig', 413, true, {
      hasErrorEnvelope: true,
      details: { code: 'FileTooBig', limit: 1000 },
    });

    expect(getUploadTooLargeError(error)).toEqual({ reason: 'requestLimit', limit: 1000 });
  });

  it('reads the details of an SSE file:error payload', () => {
    expect(getUploadTooLargeError({ details: { code: 'SizeLimitExceeded', limit: 1000 } })).toEqual(
      { reason: 'sizeLimit', limit: 1000 }
    );
  });

  it('blames a limit outside Strapi for an XHR 413 without a Strapi error', () => {
    const error = new UploadFileError('Upload failed with status 413', 413);

    expect(getUploadTooLargeError(error)).toEqual({ reason: 'external' });
  });

  it('blames a limit outside Strapi for an RTK Query 413 without a Strapi error', () => {
    expect(
      getUploadTooLargeError({ name: 'UnknownError', message: 'Unknown Server Error', status: 413 })
    ).toEqual({ reason: 'external' });
  });

  it('does not blame a proxy for a Strapi 413 without size details', () => {
    expect(
      getUploadTooLargeError({ status: 413, name: 'PayloadTooLargeError', message: 'too large' })
    ).toBeUndefined();
    expect(
      getUploadTooLargeError(
        new UploadFileError('too large', 413, true, { hasErrorEnvelope: true, details: {} })
      )
    ).toBeUndefined();
  });

  it('ignores errors that are not about size', () => {
    expect(getUploadTooLargeError({ status: 400, message: 'Invalid' })).toBeUndefined();
    expect(getUploadTooLargeError(new UploadFileError('Network error occurred'))).toBeUndefined();
    expect(getUploadTooLargeError(undefined)).toBeUndefined();
  });
});

describe('formatSizeLimit', () => {
  it('formats like the server does', () => {
    expect(formatSizeLimit(209715200)).toBe('210 MB');
    expect(formatSizeLimit(200000000)).toBe('200 MB');
    expect(formatSizeLimit(1000000000)).toBe('1 GB');
    expect(formatSizeLimit(200000)).toBe('200 KB');
    expect(formatSizeLimit(0)).toBe('0 Bytes');
  });
});
