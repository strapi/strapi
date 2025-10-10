/* eslint-disable import/first */
import stream from 'stream';

jest.mock('fs');

import fs from 'fs-extra';
import { Writable } from 'stream-chain';
import { createLocalFileDestinationProvider, ILocalFileDestinationProviderOptions } from '..';
import * as encryption from '../../../../utils/encryption';
import { createFilePathFactory, createTarEntryStream } from '../utils';

fs.createWriteStream = jest.fn().mockReturnValue(
  new Writable({
    objectMode: true,
    write() {},
  })
);

const filePath = './test-file';

jest.mock('../../../../utils/encryption', () => {
  return {
    __esModule: true,
    createEncryptionCipher() {},
  };
});

jest.mock('../utils');

describe('Local File Destination Provider', () => {
  (createFilePathFactory as jest.Mock).mockImplementation(jest.fn());

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Bootstrap', () => {
    it('Throws an error if encryption is enabled and the key is not provided', () => {
      const providerOptions = {
        encryption: { enabled: true },
        compression: { enabled: false },
        file: { path: './test-file' },
      };
      const provider = createLocalFileDestinationProvider(providerOptions);

      expect(() => provider.bootstrap()).toThrowError("Can't encrypt without a key");
    });

    it('Adds .gz extension to the archive path when compression is enabled', async () => {
      const providerOptions = {
        encryption: { enabled: false },
        compression: { enabled: true },
        file: { path: filePath },
      };
      const provider = createLocalFileDestinationProvider(providerOptions);

      await provider.bootstrap();

      expect(provider.results.file?.path).toEqual(`${filePath}.tar.gz`);
    });

    it('Adds .enc extension to the archive path when encryption is enabled', async () => {
      const providerOptions: ILocalFileDestinationProviderOptions = {
        encryption: { enabled: true, key: 'key' },
        compression: { enabled: false },
        file: { path: filePath },
      };
      const provider = createLocalFileDestinationProvider(providerOptions);

      await provider.bootstrap();

      expect(provider.results.file?.path).toEqual(`${filePath}.tar.enc`);
    });

    it('Adds .gz.enc extension to the archive path when encryption and compression are enabled', async () => {
      const providerOptions: ILocalFileDestinationProviderOptions = {
        encryption: { enabled: true, key: 'key' },
        compression: { enabled: true },
        file: { path: filePath },
      };
      const provider = createLocalFileDestinationProvider(providerOptions);

      await provider.bootstrap();

      expect(provider.results.file?.path).toEqual(`${filePath}.tar.gz.enc`);
    });

    it('Adds the compression step to the stream chain when compression is enabled', async () => {
      const providerOptions: ILocalFileDestinationProviderOptions = {
        encryption: { enabled: true, key: 'key' },
        compression: { enabled: true },
        file: { path: filePath },
      };
      const provider = createLocalFileDestinationProvider(providerOptions);
      jest.spyOn(provider, 'createGzip');

      await provider.bootstrap();

      expect(provider.createGzip).toHaveBeenCalled();
    });

    it('Adds the encryption step to the stream chain when encryption is enabled', async () => {
      jest.spyOn(encryption, 'createEncryptionCipher');
      const key = 'key';
      const providerOptions: ILocalFileDestinationProviderOptions = {
        encryption: { enabled: true, key },
        compression: { enabled: true },
        file: { path: filePath },
      };
      const provider = createLocalFileDestinationProvider(providerOptions);

      await provider.bootstrap();

      expect(encryption.createEncryptionCipher).toHaveBeenCalledWith(key);
    });
  });

  describe('Streaming entities', () => {
    const providerOptions: ILocalFileDestinationProviderOptions = {
      encryption: { enabled: false },
      compression: { enabled: false },
      file: { path: filePath },
    };
    (createTarEntryStream as jest.Mock).mockImplementation(jest.fn());

    it('Creates a tar entry stream', async () => {
      const provider = createLocalFileDestinationProvider(providerOptions);

      await provider.bootstrap();
      provider.createEntitiesWriteStream();

      expect(createTarEntryStream).toHaveBeenCalled();
      expect(createFilePathFactory).toHaveBeenCalledWith('entities');
    });
    it('Returns a stream', async () => {
      const provider = createLocalFileDestinationProvider(providerOptions);

      await provider.bootstrap();
      const entitiesStream = provider.createEntitiesWriteStream();

      expect(entitiesStream instanceof stream.Writable).toBeTruthy();
    });
  });

  describe('Streaming schemas', () => {
    const providerOptions: ILocalFileDestinationProviderOptions = {
      encryption: { enabled: false },
      compression: { enabled: false },
      file: { path: filePath },
    };
    (createTarEntryStream as jest.Mock).mockImplementation(jest.fn());

    it('Creates a tar entry stream for schemas', async () => {
      const provider = createLocalFileDestinationProvider(providerOptions);

      await provider.bootstrap();
      provider.createSchemasWriteStream();

      expect(createTarEntryStream).toHaveBeenCalled();
      expect(createFilePathFactory).toHaveBeenCalledWith('schemas');
    });

    it('Returns a stream', async () => {
      const provider = createLocalFileDestinationProvider(providerOptions);

      await provider.bootstrap();
      const schemasStream = provider.createSchemasWriteStream();

      expect(schemasStream instanceof stream.Writable).toBeTruthy();
    });
  });

  describe('Streaming links', () => {
    const providerOptions: ILocalFileDestinationProviderOptions = {
      encryption: { enabled: false },
      compression: { enabled: false },
      file: { path: filePath },
    };
    (createTarEntryStream as jest.Mock).mockImplementation(jest.fn());

    it('Creates a tar entry stream for links', async () => {
      const provider = createLocalFileDestinationProvider(providerOptions);

      await provider.bootstrap();
      provider.createLinksWriteStream();

      expect(createTarEntryStream).toHaveBeenCalled();
      expect(createFilePathFactory).toHaveBeenCalledWith('links');
    });

    it('Returns a stream', async () => {
      const provider = createLocalFileDestinationProvider(providerOptions);

      await provider.bootstrap();
      const linksStream = provider.createLinksWriteStream();

      expect(linksStream instanceof stream.Writable).toBeTruthy();
    });
  });

  describe('Streaming configuration', () => {
    const providerOptions: ILocalFileDestinationProviderOptions = {
      encryption: { enabled: false },
      compression: { enabled: false },
      file: { path: filePath },
    };
    (createTarEntryStream as jest.Mock).mockImplementation(jest.fn());

    it('Creates a tar entry stream for configuration', async () => {
      const provider = createLocalFileDestinationProvider(providerOptions);

      await provider.bootstrap();
      provider.createConfigurationWriteStream();

      expect(createTarEntryStream).toHaveBeenCalled();
      expect(createFilePathFactory).toHaveBeenCalledWith('configuration');
    });

    it('Returns a stream', async () => {
      const provider = createLocalFileDestinationProvider(providerOptions);

      await provider.bootstrap();
      const configurationStream = provider.createConfigurationWriteStream();

      expect(configurationStream instanceof stream.Writable).toBeTruthy();
    });
  });
});
