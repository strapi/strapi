'use strict';

const { isUrlFromBucket } = require('../utils');

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

  test('DO Spaces', async () => {
    const url = 'https://bucket.nyc3.digitaloceanspaces.com/folder/img.png';
    const isFromBucket = isUrlFromBucket(url, 'bucket');
    expect(isFromBucket).toEqual(true);
  });

  test('MinIO', async () => {
    const url = 'https://minio.example.com/bucket/folder/file';
    const isFromBucket = isUrlFromBucket(url, 'bucket');
    expect(isFromBucket).toEqual(true);
  });

  test('Oracle', async () => {
    const url =
      'https://swiftobjectstorage.region.oraclecloud.com/v1/namespace/bucket-name/folder/file';
    const isFromBucket = isUrlFromBucket(url, 'bucket-name');
    expect(isFromBucket).toEqual(true);
  });

  test('Scaleway', async () => {
    const url = 'https://s3.storage.nl-ams.cloud.scaleway.com/bucket/folder/file';
    const isFromBucket = isUrlFromBucket(url, 'bucket');
    expect(isFromBucket).toEqual(true);
  });

  test('CDN', async () => {
    const url = 'https://cdn.example.com/v1/img.png';
    const isFromBucket = isUrlFromBucket(url, 'bucket', 'https://cdn.example.com/v1/');
    expect(isFromBucket).toEqual(true);
  });
});
