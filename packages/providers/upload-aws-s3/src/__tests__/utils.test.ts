import { ObjectCannedACL } from '@aws-sdk/client-s3';
import type { InitOptions } from '..';

const accessKeyId = 'AWS_ACCESS_KEY_ID';
const secretAccessKey = 'AWS_ACCESS_SECRET';

const defaultOptions = {
  region: 'AWS_REGION',
  params: {
    ACL: ObjectCannedACL.public_read,
    signedUrlExpires: 111111111111,
    Bucket: 'AWS_BUCKET',
  },
};

describe('Utils', () => {
  test('Credentials in credentials object inside s3Options', () => {
    const options: InitOptions = {
      s3Options: {
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        ...defaultOptions,
      },
    };
    const credentials = options.s3Options.credentials;

    expect(credentials).toEqual({
      accessKeyId,
      secretAccessKey,
    });
  });
  test('Does not throw an error when credentials are not present', () => {
    const options: InitOptions = {
      s3Options: {
        ...defaultOptions,
      },
    };
    const credentials = options.s3Options.credentials;

    expect(credentials).toEqual(null);
  });
});
