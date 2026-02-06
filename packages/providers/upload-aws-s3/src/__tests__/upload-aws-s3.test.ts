import awsProvider, { File } from '../index';

jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  extractCredentials: jest.fn().mockReturnValue({
    accessKeyId: 'test',
    secretAccessKey: 'test',
  }),
}));

const uploadMock = {
  done: jest.fn(),
};

jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest.fn().mockImplementation(() => uploadMock),
}));

describe('AWS-S3 provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('upload', () => {
    test('Should populate file.url with the baseUrl when provided, appending the file key to the url', async () => {
      uploadMock.done.mockImplementationOnce(() =>
        Promise.resolve({
          Location: 'https://strapi.io/path/to/fileNameHash.json',
          $metadata: {},
        })
      );

      const providerInstance = awsProvider.init({
        baseUrl: 'https://assets.strapi.io',
        s3Options: {
          params: {
            Bucket: 'bucket-name',
          },
        },
      });

      const file: File = {
        name: 'fileName',
        size: 100,
        sizeInBytes: 100 * 1024,
        url: '',
        path: 'path/to',
        hash: 'fileNameHash',
        ext: '.json',
        mime: 'application/json',
        buffer: Buffer.from(''),
      };

      await providerInstance.upload(file);

      expect(uploadMock.done).toBeCalled();
      expect(file.url).toBeDefined();
      expect(file.url).toEqual('https://assets.strapi.io/path/to/fileNameHash.json');
    });
    test('Should populate file.url with the returned Location when no baseUrl is provided', async () => {
      uploadMock.done.mockImplementationOnce(() =>
        Promise.resolve({
          Location: 'https://strapi.io/path/from/location/fileName.json',
          $metadata: {},
        })
      );

      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'bucket-name',
          },
        },
      });

      const file: File = {
        name: 'fileName',
        size: 100,
        sizeInBytes: 100 * 1024,
        url: '',
        path: 'path/from/location',
        hash: 'fileNameHash',
        ext: '.json',
        mime: 'application/json',
        buffer: Buffer.from(''),
      };

      await providerInstance.upload(file);

      expect(uploadMock.done).toBeCalled();
      expect(file.url).toBeDefined();
      expect(file.url).toEqual('https://strapi.io/path/from/location/fileName.json');
    });
    test('Should populate file.url and prepend the https protocol to the Location when missing', async () => {
      uploadMock.done.mockImplementationOnce(() =>
        Promise.resolve({
          Location: 'strapi.io/path/to/fileNameHash.json',
          $metadata: {},
        })
      );

      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'bucket-name',
          },
        },
      });

      const file: File = {
        name: 'fileName',
        size: 100,
        sizeInBytes: 100 * 1024,
        url: '',
        path: 'path/to',
        hash: 'fileNameHash',
        ext: '.json',
        mime: 'application/json',
        buffer: Buffer.from(''),
      };

      await providerInstance.upload(file);

      expect(uploadMock.done).toBeCalled();
      expect(file.url).toBeDefined();
      expect(file.url).toEqual('https://strapi.io/path/to/fileNameHash.json');
    });
    test('Should populate file.url with baseUrl even if location lacks protocol', async () => {
      uploadMock.done.mockImplementationOnce(() =>
        Promise.resolve({
          Location: 'otherdomain.com/different/path/file.json',
          $metadata: {},
        })
      );

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
        sizeInBytes: 100 * 1024,
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
    test('Should populate file.url with baseUrl and rootPath', async () => {
      uploadMock.done.mockImplementationOnce(() =>
        Promise.resolve({
          Location: 'https://validurl.test/tmp/test.json',
          $metadata: {},
        })
      );

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
        sizeInBytes: 100 * 1024,
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
