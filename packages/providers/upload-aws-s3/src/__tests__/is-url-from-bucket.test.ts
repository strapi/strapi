import { isUrlFromBucket } from '../utils';

describe('Test for URLs', () => {
  describe('AWS', () => {
    test('Virtual hosted style', async () => {
      const url = 'https://bucket-name-123.s3.us-east-1.amazonaws.com/img.png';
      const isFromBucket = isUrlFromBucket(url, 'bucket-name-123');
      expect(isFromBucket).toEqual(true);
    });

    describe('Path style', () => {
      test('No key', async () => {
        const url = 'https://s3.us-east-1.amazonaws.com/bucket';
        const isFromBucket = isUrlFromBucket(url, 'bucket');
        expect(isFromBucket).toEqual(true);
      });

      test('With trailing slash', async () => {
        const url = 'https://s3.us-east-1.amazonaws.com/bucket/';
        const isFromBucket = isUrlFromBucket(url, 'bucket');
        expect(isFromBucket).toEqual(true);
      });

      test('With key', async () => {
        const url = 'https://s3.us-east-1.amazonaws.com/bucket/img.png';
        const isFromBucket = isUrlFromBucket(url, 'bucket');
        expect(isFromBucket).toEqual(true);
      });
    });

    test('S3 access point', async () => {
      const url = 'https://bucket.s3-accesspoint.us-east-1.amazonaws.com';
      const isFromBucket = isUrlFromBucket(url, 'bucket');
      expect(isFromBucket).toEqual(true);
    });

    test('S3://', async () => {
      const url = 'S3://bucket/img.png';
      const isFromBucket = isUrlFromBucket(url, 'bucket');
      expect(isFromBucket).toEqual(true);
    });
  });

  describe('S3 Compatible', () => {
    describe('DO Spaces', () => {
      test('virtual-hosted-style: is from same bucket', async () => {
        const url = 'https://bucket-name.nyc3.digitaloceanspaces.com/folder/img.png';
        const isFromBucket = isUrlFromBucket(url, 'bucket-name');
        expect(isFromBucket).toEqual(true);
      });
      test('virtual-hosted-style: is not from same bucket', async () => {
        const url = 'https://bucket-name.nyc3.digitaloceanspaces.com/folder/img.png';
        const isFromBucket = isUrlFromBucket(url, 'bucket');
        expect(isFromBucket).toEqual(false);
      });
      test('CDN path-style (forcePathStyle:true): bucket in path, is from same bucket', async () => {
        // URL generated when endpoint is set to the CDN and forcePathStyle:true
        // e.g. https://fra1.cdn.digitaloceanspaces.com/pcstrapi/thumbnail_IMG_1351.jpg
        const url = 'https://fra1.cdn.digitaloceanspaces.com/pcstrapi/thumbnail_IMG_1351.jpg';
        const isFromBucket = isUrlFromBucket(url, 'pcstrapi');
        expect(isFromBucket).toEqual(true);
      });
      test('CDN path-style (forcePathStyle:true): bucket in path, is not from same bucket', async () => {
        const url = 'https://fra1.cdn.digitaloceanspaces.com/pcstrapi/thumbnail_IMG_1351.jpg';
        const isFromBucket = isUrlFromBucket(url, 'other-bucket');
        expect(isFromBucket).toEqual(false);
      });
    });

    describe('MinIO', () => {
      test('is from same bucket', async () => {
        const url = 'https://minio.example.com/bucket-name/folder/file';
        const isFromBucket = isUrlFromBucket(url, 'bucket-name');
        expect(isFromBucket).toEqual(true);
      });

      test('is not from same bucket', async () => {
        const url = 'https://minio.example.com/bucket-name/folder/file';
        const isFromBucket = isUrlFromBucket(url, 'bucket');
        expect(isFromBucket).toEqual(false);
      });
    });
  });

  test('CDN', async () => {
    const url = 'https://cdn.example.com/v1/img.png';
    const isFromBucket = isUrlFromBucket(url, 'bucket', 'https://cdn.example.com/v1/');
    expect(isFromBucket).toEqual(false);
  });
});
