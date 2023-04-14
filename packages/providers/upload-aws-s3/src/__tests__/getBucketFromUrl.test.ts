import { getBucketFromUrl } from '../utils';

describe('Test for URLs', () => {
  test('Virtual hosted style', async () => {
    const url = 'https://bucket.s3.us-east-1.amazonaws.com/img.png';
    const { bucket } = getBucketFromUrl(url);
    expect(bucket).toEqual('bucket');
  });

  describe('Path style', () => {
    test('No key', async () => {
      const url = 'https://s3.us-east-1.amazonaws.com/bucket';
      const { bucket } = getBucketFromUrl(url);
      expect(bucket).toEqual('bucket');
    });

    test('With trailing slash', async () => {
      const url = 'https://s3.us-east-1.amazonaws.com/bucket/';
      const { bucket } = getBucketFromUrl(url);
      expect(bucket).toEqual('bucket');
    });

    test('With key', async () => {
      const url = 'https://s3.us-east-1.amazonaws.com/bucket/img.png';
      const { bucket } = getBucketFromUrl(url);
      expect(bucket).toEqual('bucket');
    });
  });

  test('S3 access point', async () => {
    const url = 'https://bucket.s3-accesspoint.us-east-1.amazonaws.com';
    const { bucket } = getBucketFromUrl(url);
    expect(bucket).toEqual('bucket');
  });

  test('S3://', async () => {
    const url = 'S3://bucket/img.png';
    const { bucket } = getBucketFromUrl(url);
    expect(bucket).toEqual('bucket');
  });
});
