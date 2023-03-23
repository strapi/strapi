'use strict';

const AWS = require('aws-sdk');
const awsProvider = require('../index');

jest.mock('aws-sdk');

const S3InstanceMock = {
  upload: jest.fn((params, callback) => callback(null, {})),
};

AWS.S3.mockReturnValue(S3InstanceMock);

describe('AWS-S3 provider', () => {
  const providerInstance = awsProvider.init({});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('upload', () => {
    test('Should add url to file object', async () => {
      S3InstanceMock.upload.mockImplementationOnce((params, callback) =>
        callback(null, { Location: 'https://validurl.test/tmp/test.json' })
      );
      const file = {
        path: '/tmp/',
        hash: 'test',
        ext: '.json',
        mime: 'application/json',
        buffer: '',
      };

      await providerInstance.upload(file);

      expect(S3InstanceMock.upload).toBeCalled();
      expect(file.url).toBeDefined();
      expect(file.url).toEqual('https://validurl.test/tmp/test.json');
    });

    test('Should add to the url the https protocol as it is missing', async () => {
      S3InstanceMock.upload.mockImplementationOnce((params, callback) =>
        callback(null, { Location: 'uri.test/tmp/test.json' })
      );
      const file = {
        path: '/tmp/',
        hash: 'test',
        ext: '.json',
        mime: 'application/json',
        buffer: '',
      };

      await providerInstance.upload(file);

      expect(S3InstanceMock.upload).toBeCalled();
      expect(file.url).toBeDefined();
      expect(file.url).toEqual('https://uri.test/tmp/test.json');
    });

    test('Should prepend the baseUrl to the url of the file object', async () => {
      const providerInstance = awsProvider.init({ baseUrl: 'https://cdn.test' });

      S3InstanceMock.upload.mockImplementationOnce((params, callback) =>
        callback(null, { Location: 'https://validurl.test' })
      );
      const file = {
        path: 'tmp/test',
        hash: 'test',
        ext: '.json',
        mime: 'application/json',
        buffer: '',
      };

      await providerInstance.upload(file);

      expect(S3InstanceMock.upload).toBeCalled();
      expect(file.url).toBeDefined();
      expect(file.url).toEqual('https://cdn.test/tmp/test/test.json');
    });

    test('Should prepend the baseUrl and rootPath to the url of the file object', async () => {
      const providerInstance = awsProvider.init({
        baseUrl: 'https://cdn.test',
        rootPath: 'dir/dir2',
      });

      S3InstanceMock.upload.mockImplementationOnce((params, callback) =>
        callback(null, { Location: 'https://validurl.test' })
      );
      const file = {
        path: 'tmp/test',
        hash: 'test',
        ext: '.json',
        mime: 'application/json',
        buffer: '',
      };

      await providerInstance.upload(file);

      expect(S3InstanceMock.upload).toBeCalled();
      expect(file.url).toBeDefined();
      expect(file.url).toEqual('https://cdn.test/dir/dir2/tmp/test/test.json');
    });
  });
});
