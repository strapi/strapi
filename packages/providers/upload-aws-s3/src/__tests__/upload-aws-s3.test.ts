import { Upload } from '@aws-sdk/lib-storage';

import awsProvider, { File, ProviderConfig } from '../index';

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
      ETag: '"abc123def456"',
      $metadata: {},
    })
  ),
};

jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest.fn().mockImplementation(() => uploadMock),
}));

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
  };
});

const createTestFile = (overrides: Partial<File> = {}): File => ({
  name: 'test',
  size: 100,
  sizeInBytes: 100,
  url: '',
  path: 'tmp',
  hash: 'test',
  ext: '.json',
  mime: 'application/json',
  buffer: Buffer.from('test content'),
  ...overrides,
});

describe('AWS-S3 provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockReset();
    uploadMock.done.mockImplementation(() =>
      Promise.resolve({
        Location: 'https://validurl.test/tmp/test.json',
        ETag: '"abc123def456"',
        $metadata: {},
      })
    );
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

      expect(uploadMock.done).toHaveBeenCalled();
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

      expect(uploadMock.done).toHaveBeenCalled();
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

      expect(file.url).toEqual('https://cdn.test/dir/dir2/tmp/test/test.json');
    });

    test('should store ETag from upload response', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      expect(file.etag).toBeDefined();
      expect(file.etag).toEqual('abc123def456');
    });
  });

  describe('isPrivate', () => {
    test('should return true when ACL is private', () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
            ACL: 'private',
          },
        },
      });

      expect(providerInstance.isPrivate()).toBe(true);
    });

    test('should return false when ACL is public', () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
            ACL: 'public-read',
          },
        },
      });

      expect(providerInstance.isPrivate()).toBe(false);
    });
  });

  describe('checksum validation', () => {
    test('should include CRC32 checksum algorithm when configured', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          checksumAlgorithm: 'CRC32',
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.ChecksumAlgorithm).toBe('CRC32');
    });

    test('should include SHA256 checksum algorithm when configured', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          checksumAlgorithm: 'SHA256',
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.ChecksumAlgorithm).toBe('SHA256');
    });

    test('should include CRC64NVME checksum algorithm when configured', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          checksumAlgorithm: 'CRC64NVME',
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.ChecksumAlgorithm).toBe('CRC64NVME');
    });

    test('should not include checksum algorithm when not configured', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.ChecksumAlgorithm).toBeUndefined();
    });
  });

  describe('conditional writes (preventOverwrite)', () => {
    test('should include IfNoneMatch header when preventOverwrite is enabled', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          preventOverwrite: true,
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.IfNoneMatch).toBe('*');
    });

    test('should not include IfNoneMatch header when preventOverwrite is disabled', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          preventOverwrite: false,
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.IfNoneMatch).toBeUndefined();
    });
  });

  describe('storage class configuration', () => {
    test('should set STANDARD storage class', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          storageClass: 'STANDARD',
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.StorageClass).toBe('STANDARD');
    });

    test('should set INTELLIGENT_TIERING storage class', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          storageClass: 'INTELLIGENT_TIERING',
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.StorageClass).toBe('INTELLIGENT_TIERING');
    });

    test('should set GLACIER storage class', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          storageClass: 'GLACIER',
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.StorageClass).toBe('GLACIER');
    });

    test('should set DEEP_ARCHIVE storage class', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          storageClass: 'DEEP_ARCHIVE',
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.StorageClass).toBe('DEEP_ARCHIVE');
    });
  });

  describe('server-side encryption', () => {
    test('should set AES256 encryption', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          encryption: {
            type: 'AES256',
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.ServerSideEncryption).toBe('AES256');
      expect(uploadCall.params.SSEKMSKeyId).toBeUndefined();
    });

    test('should set KMS encryption with key ID', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          encryption: {
            type: 'aws:kms',
            kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.ServerSideEncryption).toBe('aws:kms');
      expect(uploadCall.params.SSEKMSKeyId).toBe(
        'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
      );
    });

    test('should set DSSE-KMS encryption', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          encryption: {
            type: 'aws:kms:dsse',
            kmsKeyId: 'test-key-id',
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.ServerSideEncryption).toBe('aws:kms:dsse');
      expect(uploadCall.params.SSEKMSKeyId).toBe('test-key-id');
    });
  });

  describe('object tagging', () => {
    test('should set single tag', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          tags: {
            project: 'test-project',
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.Tagging).toBe('project=test-project');
    });

    test('should set multiple tags', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          tags: {
            project: 'test-project',
            environment: 'production',
            team: 'backend',
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.Tagging).toContain('project=test-project');
      expect(uploadCall.params.Tagging).toContain('environment=production');
      expect(uploadCall.params.Tagging).toContain('team=backend');
    });

    test('should encode special characters in tags', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          tags: {
            'key with spaces': 'value with spaces',
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.Tagging).toBe('key%20with%20spaces=value%20with%20spaces');
    });

    test('should not set tagging when tags are empty', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          tags: {},
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.Tagging).toBeUndefined();
    });
  });

  describe('multipart upload configuration', () => {
    test('should set custom part size', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          multipart: {
            partSize: 10 * 1024 * 1024, // 10MB
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.partSize).toBe(10 * 1024 * 1024);
    });

    test('should set custom queue size', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          multipart: {
            queueSize: 8,
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.queueSize).toBe(8);
    });

    test('should set leavePartsOnError option', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          multipart: {
            leavePartsOnError: true,
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.leavePartsOnError).toBe(true);
    });

    test('should set all multipart options together', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          multipart: {
            partSize: 5 * 1024 * 1024,
            queueSize: 4,
            leavePartsOnError: false,
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.partSize).toBe(5 * 1024 * 1024);
      expect(uploadCall.queueSize).toBe(4);
      expect(uploadCall.leavePartsOnError).toBe(false);
    });
  });

  describe('uploadIfMatch (optimistic locking)', () => {
    test('should include IfMatch header with expected ETag', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      const file = createTestFile();
      await providerInstance.uploadIfMatch(file, 'expected-etag-123');

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.IfMatch).toBe('expected-etag-123');
    });

    test('should update file url and etag after successful upload', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      const file = createTestFile();
      await providerInstance.uploadIfMatch(file, 'expected-etag');

      expect(file.url).toEqual('https://validurl.test/tmp/test.json');
      expect(file.etag).toEqual('abc123def456');
    });
  });

  describe('getObjectMetadata', () => {
    test('should return object metadata', async () => {
      mockSend.mockResolvedValueOnce({
        ETag: '"test-etag"',
        ContentLength: 1024,
        ContentType: 'application/json',
        LastModified: new Date('2024-01-01'),
        StorageClass: 'STANDARD',
        ServerSideEncryption: 'AES256',
      });

      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      const file = createTestFile();
      const metadata = await providerInstance.getObjectMetadata(file);

      expect(metadata.etag).toBe('test-etag');
      expect(metadata.contentLength).toBe(1024);
      expect(metadata.contentType).toBe('application/json');
      expect(metadata.storageClass).toBe('STANDARD');
      expect(metadata.serverSideEncryption).toBe('AES256');
    });
  });

  describe('objectExists', () => {
    test('should return true when object exists', async () => {
      mockSend.mockResolvedValueOnce({
        ETag: '"test-etag"',
      });

      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      const file = createTestFile();
      const exists = await providerInstance.objectExists(file);

      expect(exists).toBe(true);
    });

    test('should return false when object does not exist (NotFound)', async () => {
      const notFoundError = new Error('Not Found');
      (notFoundError as any).name = 'NotFound';
      mockSend.mockRejectedValueOnce(notFoundError);

      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      const file = createTestFile();
      const exists = await providerInstance.objectExists(file);

      expect(exists).toBe(false);
    });

    test('should return false when object does not exist (404 status)', async () => {
      const notFoundError = new Error('Not Found');
      (notFoundError as any).$metadata = { httpStatusCode: 404 };
      mockSend.mockRejectedValueOnce(notFoundError);

      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      const file = createTestFile();
      const exists = await providerInstance.objectExists(file);

      expect(exists).toBe(false);
    });

    test('should throw error for other errors', async () => {
      const serverError = new Error('Internal Server Error');
      (serverError as any).name = 'InternalError';
      mockSend.mockRejectedValueOnce(serverError);

      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      const file = createTestFile();
      await expect(providerInstance.objectExists(file)).rejects.toThrow('Internal Server Error');
    });
  });

  describe('getProviderConfig', () => {
    test('should return provider configuration', () => {
      const config: ProviderConfig = {
        checksumAlgorithm: 'SHA256',
        preventOverwrite: true,
        storageClass: 'INTELLIGENT_TIERING',
        encryption: {
          type: 'AES256',
        },
        tags: {
          project: 'test',
        },
      };

      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: config,
      });

      expect(providerInstance.getProviderConfig()).toEqual(config);
    });

    test('should return undefined when no provider config', () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      expect(providerInstance.getProviderConfig()).toBeUndefined();
    });
  });

  describe('combined configuration', () => {
    test('should apply all configurations together', async () => {
      const providerInstance = awsProvider.init({
        baseUrl: 'https://cdn.test',
        rootPath: 'uploads',
        s3Options: {
          params: {
            Bucket: 'test-bucket',
            ACL: 'private',
          },
        },
        providerConfig: {
          checksumAlgorithm: 'CRC64NVME',
          preventOverwrite: true,
          storageClass: 'STANDARD_IA',
          encryption: {
            type: 'aws:kms',
            kmsKeyId: 'test-key',
          },
          tags: {
            environment: 'test',
          },
          multipart: {
            partSize: 10 * 1024 * 1024,
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];

      expect(uploadCall.params.Bucket).toBe('test-bucket');
      expect(uploadCall.params.ACL).toBe('private');
      expect(uploadCall.params.ChecksumAlgorithm).toBe('CRC64NVME');
      expect(uploadCall.params.IfNoneMatch).toBe('*');
      expect(uploadCall.params.StorageClass).toBe('STANDARD_IA');
      expect(uploadCall.params.ServerSideEncryption).toBe('aws:kms');
      expect(uploadCall.params.SSEKMSKeyId).toBe('test-key');
      expect(uploadCall.params.Tagging).toBe('environment=test');
      expect(uploadCall.partSize).toBe(10 * 1024 * 1024);

      expect(file.url).toBe('https://cdn.test/uploads/tmp/test.json');
      expect(providerInstance.isPrivate()).toBe(true);
    });
  });

  describe('security: path traversal prevention', () => {
    test('should sanitize path traversal sequences in file.path', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      const file = createTestFile({ path: '../../../etc/passwd' });
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.Key).not.toContain('..');
      expect(uploadCall.params.Key).toBe('etc/passwd/test.json');
    });

    test('should sanitize path traversal sequences in file.hash', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      const file = createTestFile({ path: '', hash: '../../../malicious' });
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.Key).not.toContain('..');
      expect(uploadCall.params.Key).toBe('malicious.json');
    });

    test('should sanitize special characters in file.ext', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      const file = createTestFile({ ext: '.json;rm -rf /' });
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.Key).toBe('tmp/test.jsonrmrf');
    });

    test('should handle multiple consecutive slashes', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      const file = createTestFile({ path: 'foo///bar//baz' });
      await providerInstance.upload(file);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.Key).toBe('foo/bar/baz/test.json');
    });
  });

  describe('security: customParams protection', () => {
    test('should not allow Bucket override via customParams in upload', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'secure-bucket',
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file, { Bucket: 'malicious-bucket' } as any);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.Bucket).toBe('secure-bucket');
    });

    test('should not allow Key override via customParams in upload', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file, { Key: 'malicious-key' } as any);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.Key).toBe('tmp/test.json');
    });

    test('should not allow Body override via customParams in upload', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      const file = createTestFile();
      const maliciousBody = Buffer.from('malicious content');
      await providerInstance.upload(file, { Body: maliciousBody } as any);

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.Body).toEqual(Buffer.from('test content'));
    });

    test('should allow safe customParams like ContentDisposition', async () => {
      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file, { ContentDisposition: 'attachment' });

      const uploadCall = (Upload as jest.Mock).mock.calls[0][0];
      expect(uploadCall.params.ContentDisposition).toBe('attachment');
    });
  });

  describe('security: URL protocol validation', () => {
    test('should accept https protocol in upload response', async () => {
      uploadMock.done.mockImplementationOnce(() =>
        Promise.resolve({
          Location: 'https://bucket.s3.amazonaws.com/file.json',
          ETag: '"abc"',
        })
      );

      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      expect(file.url).toBe('https://bucket.s3.amazonaws.com/file.json');
    });

    test('should accept http protocol for S3-compatible providers', async () => {
      uploadMock.done.mockImplementationOnce(() =>
        Promise.resolve({
          Location: 'http://minio.local:9000/bucket/file.json',
          ETag: '"abc"',
        })
      );

      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      expect(file.url).toBe('http://minio.local:9000/bucket/file.json');
    });

    test('should prepend https for URLs without protocol', async () => {
      uploadMock.done.mockImplementationOnce(() =>
        Promise.resolve({
          Location: 'bucket.s3.amazonaws.com/file.json',
          ETag: '"abc"',
        })
      );

      const providerInstance = awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      expect(file.url).toBe('https://bucket.s3.amazonaws.com/file.json');
    });
  });

  describe('S3-compatible provider URL construction', () => {
    test('should construct URL from endpoint for IONOS', async () => {
      uploadMock.done.mockImplementationOnce(() =>
        Promise.resolve({
          // IONOS returns incorrect Location format for multipart uploads
          Location: 'my-bucket/tmp/test.json',
          ETag: '"abc"',
        })
      );

      const providerInstance = awsProvider.init({
        s3Options: {
          endpoint: 'https://s3-eu-central-2.ionoscloud.com',
          params: {
            Bucket: 'my-bucket',
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      expect(file.url).toBe('https://s3-eu-central-2.ionoscloud.com/my-bucket/tmp/test.json');
    });

    test('should construct URL from endpoint for MinIO', async () => {
      uploadMock.done.mockImplementationOnce(() =>
        Promise.resolve({
          Location: 'test-bucket/tmp/test.json',
          ETag: '"abc"',
        })
      );

      const providerInstance = awsProvider.init({
        s3Options: {
          endpoint: 'http://minio.local:9000',
          params: {
            Bucket: 'test-bucket',
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      expect(file.url).toBe('http://minio.local:9000/test-bucket/tmp/test.json');
    });

    test('should prefer baseUrl over endpoint', async () => {
      uploadMock.done.mockImplementationOnce(() =>
        Promise.resolve({
          Location: 'bucket/tmp/test.json',
          ETag: '"abc"',
        })
      );

      const providerInstance = awsProvider.init({
        baseUrl: 'https://cdn.example.com',
        s3Options: {
          endpoint: 'https://s3-eu-central-2.ionoscloud.com',
          params: {
            Bucket: 'my-bucket',
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      expect(file.url).toBe('https://cdn.example.com/tmp/test.json');
    });

    test('should handle endpoint without protocol', async () => {
      uploadMock.done.mockImplementationOnce(() =>
        Promise.resolve({
          Location: 'bucket/tmp/test.json',
          ETag: '"abc"',
        })
      );

      const providerInstance = awsProvider.init({
        s3Options: {
          endpoint: 's3.wasabisys.com',
          params: {
            Bucket: 'my-bucket',
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      expect(file.url).toBe('https://s3.wasabisys.com/my-bucket/tmp/test.json');
    });

    test('should use S3 Location when no endpoint configured (AWS)', async () => {
      uploadMock.done.mockImplementationOnce(() =>
        Promise.resolve({
          Location: 'https://my-bucket.s3.us-east-1.amazonaws.com/tmp/test.json',
          ETag: '"abc"',
        })
      );

      const providerInstance = awsProvider.init({
        s3Options: {
          region: 'us-east-1',
          params: {
            Bucket: 'my-bucket',
          },
        },
      });

      const file = createTestFile();
      await providerInstance.upload(file);

      expect(file.url).toBe('https://my-bucket.s3.us-east-1.amazonaws.com/tmp/test.json');
    });
  });

  describe('configuration validation', () => {
    let warningSpy: jest.SpyInstance;

    beforeEach(() => {
      warningSpy = jest.spyOn(process, 'emitWarning').mockImplementation(() => {});
    });

    afterEach(() => {
      warningSpy.mockRestore();
    });

    test('should warn when using storage class with non-AWS endpoint', () => {
      awsProvider.init({
        s3Options: {
          endpoint: 'https://minio.example.com',
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          storageClass: 'GLACIER',
        },
      });

      expect(warningSpy).toHaveBeenCalledWith(expect.stringContaining('Storage class'));
    });

    test('should warn when using KMS encryption with non-AWS endpoint', () => {
      awsProvider.init({
        s3Options: {
          endpoint: 'https://spaces.digitalocean.com',
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          encryption: {
            type: 'aws:kms',
            kmsKeyId: 'test-key',
          },
        },
      });

      expect(warningSpy).toHaveBeenCalledWith(expect.stringContaining('Encryption type'));
    });

    test('should not warn when using AWS-specific features with AWS endpoint', () => {
      awsProvider.init({
        s3Options: {
          endpoint: 'https://s3.us-east-1.amazonaws.com',
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          storageClass: 'GLACIER',
          encryption: {
            type: 'aws:kms',
            kmsKeyId: 'test-key',
          },
        },
      });

      expect(warningSpy).not.toHaveBeenCalled();
    });

    test('should not warn when using AES256 encryption with non-AWS endpoint', () => {
      awsProvider.init({
        s3Options: {
          endpoint: 'https://minio.example.com',
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          encryption: {
            type: 'AES256',
          },
        },
      });

      expect(warningSpy).not.toHaveBeenCalledWith(expect.stringContaining('Encryption type'));
    });

    test('should warn when partSize is below minimum', () => {
      awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          multipart: {
            partSize: 1024 * 1024, // 1MB - below 5MB minimum
          },
        },
      });

      expect(warningSpy).toHaveBeenCalledWith(expect.stringContaining('below the minimum'));
    });

    test('should warn when queueSize is too high', () => {
      awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          multipart: {
            queueSize: 32,
          },
        },
      });

      expect(warningSpy).toHaveBeenCalledWith(expect.stringContaining('queueSize'));
    });

    test('should not warn with valid multipart configuration', () => {
      awsProvider.init({
        s3Options: {
          params: {
            Bucket: 'test',
          },
        },
        providerConfig: {
          multipart: {
            partSize: 10 * 1024 * 1024, // 10MB - valid
            queueSize: 4,
          },
        },
      });

      expect(warningSpy).not.toHaveBeenCalled();
    });
  });
});
