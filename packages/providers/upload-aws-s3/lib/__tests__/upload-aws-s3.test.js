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
        callback(null, { Location: 'https://validurl.test' })
      );
      const file = {
        path: '/tmp/',
        hash: 'test',
        ext: 'json',
        mime: 'application/json',
        buffer: '',
      };

      await providerInstance.upload(file);

      expect(S3InstanceMock.upload).toBeCalled();
      expect(file.url).toBeDefined();
      expect(file.url).toEqual('https://validurl.test');
    });

    test('Should add to the url the https protocol as it is missing', async () => {
      S3InstanceMock.upload.mockImplementationOnce((params, callback) =>
        callback(null, { Location: 'uri.test' })
      );
      const file = {
        path: '/tmp/',
        hash: 'test',
        ext: 'json',
        mime: 'application/json',
        buffer: '',
      };

      await providerInstance.upload(file);

      expect(S3InstanceMock.upload).toBeCalled();
      expect(file.url).toBeDefined();
      expect(file.url).toEqual('https://uri.test');
    });
  });
});
