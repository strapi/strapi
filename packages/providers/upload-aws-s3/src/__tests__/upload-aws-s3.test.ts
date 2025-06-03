import awsProvider, { File } from '../index';

jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  extractCredentials: jest.fn().mockReturnValue({
    accessKeyId: 'test',
    secretAccessKey: 'test',
  }),
}));

const uploadMock = {
  done: jest.fn().mockImplementation(() =>
    Promise.resolve({
      Location: 'https://validurl.test/tmp/test.json',
      $metadata: {},
    })
  ),
};

jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest.fn().mockImplementation(() => uploadMock),
}));

describe('AWS-S3 provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('upload', () => {
    test('Should add url to file object', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      const file: File = {
        name: 'test',
        size: 100,
        url: '',
        path: 'tmp',
        hash: 'test',
        ext: '.json',
        mime: 'application/json',
        buffer: Buffer.from(''),
      };

      await providerInstance.upload(file);

      expect(uploadMock.done).toBeCalled();
      expect(file.url).toBeDefined();
      expect(file.url).toEqual('https://validurl.test/tmp/test.json');
    });

    test('Should add to the url the https protocol as it is missing', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      const file: File = {
        name: 'test',
        size: 100,
        url: '',
        path: 'tmp',
        hash: 'test',
        ext: '.json',
        mime: 'application/json',
        buffer: Buffer.from(''),
      };

      await providerInstance.upload(file);

      expect(uploadMock.done).toBeCalled();
      expect(file.url).toBeDefined();
      expect(file.url).toEqual('https://validurl.test/tmp/test.json');
    });

    test('Should prepend the baseUrl to the url of the file object', async () => {
      const providerInstance = awsProvider.init({
        baseUrl: 'https://cdn.test',
        s3Options: {
          region: 'test',
          params: {
            Bucket: 'test',
          },
        },
      });

      const file: File = {
        name: 'test',
        size: 100,
        url: '',
        path: 'tmp/test',
        hash: 'test',
        ext: '.json',
        mime: 'application/json',
        buffer: Buffer.from(''),
      };

      await providerInstance.upload(file);

      expect(uploadMock.done).toBeCalled();
      expect(file.url).toBeDefined();
      expect(file.url).toEqual('https://cdn.test/tmp/test/test.json');
    });

    test('Should prepend the baseUrl and rootPath to the url of the file object', async () => {
      const providerInstance = awsProvider.init({
        baseUrl: 'https://cdn.test',
        rootPath: 'dir/dir2',
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      const file: File = {
        name: 'test',
        size: 100,
        url: '',
        path: 'tmp/test',
        hash: 'test',
        ext: '.json',
        mime: 'application/json',
        buffer: Buffer.from(''),
      };

      await providerInstance.upload(file);

      expect(uploadMock.done).toBeCalled();
      expect(file.url).toBeDefined();
      expect(file.url).toEqual('https://cdn.test/dir/dir2/tmp/test/test.json');
    });
  });

  describe('isPrivate', () => {
    test('Should sign files if ACL is private', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
            ACL: 'private',
          },
        },
      });

      const isPrivate = providerInstance.isPrivate();

      expect(isPrivate).toBe(true);
    });

    test('Should not sign files if ACL is public', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
          params: {
            Bucket: 'test',
            ACL: 'public',
          },
        },
      });

      const isPrivate = providerInstance.isPrivate();

      expect(isPrivate).toBe(false);
    });
  });
});
