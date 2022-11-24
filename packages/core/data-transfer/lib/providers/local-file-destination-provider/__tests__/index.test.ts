import stream from 'stream';

import { createLocalFileDestinationProvider, ILocalFileDestinationProviderOptions } from '../';
import * as encryption from '../../../encryption/encrypt';
import {
  createFilePathFactory,
  createTarEntryStream,
} from '../../local-file-destination-provider/utils';

const filePath = './test-file';

jest.mock('../../../encryption/encrypt', () => {
  return {
    __esModule: true,
    createEncryptionCipher: (key: string) => {},
  };
});

jest.mock('../../local-file-destination-provider/utils');

describe('Local File Destination Provider', () => {
  (createFilePathFactory as jest.Mock).mockImplementation(jest.fn());

  afterEach(() => {
    jest.resetAllMocks();
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

      expect(provider.results.file!.path).toEqual(`${filePath}.tar.gz`);
    });

    it('Adds .enc extension to the archive path when encryption is enabled', async () => {
      const providerOptions: ILocalFileDestinationProviderOptions = {
        encryption: { enabled: true, key: 'key' },
        compression: { enabled: false },
        file: { path: filePath },
      };
      const provider = createLocalFileDestinationProvider(providerOptions);

      await provider.bootstrap();

      expect(provider.results.file!.path).toEqual(`${filePath}.tar.enc`);
    });

    it('Adds .gz.enc extension to the archive path when encryption and compression are enabled', async () => {
      const providerOptions: ILocalFileDestinationProviderOptions = {
        encryption: { enabled: true, key: 'key' },
        compression: { enabled: true },
        file: { path: filePath },
      };
      const provider = createLocalFileDestinationProvider(providerOptions);

      await provider.bootstrap();

      expect(provider.results.file!.path).toEqual(`${filePath}.tar.gz.enc`);
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
      provider.getEntitiesStream();

      expect(createTarEntryStream).toHaveBeenCalled();
      expect(createFilePathFactory).toHaveBeenCalledWith('entities');
    });
    it('Returns a stream', async () => {
      const provider = createLocalFileDestinationProvider(providerOptions);

      await provider.bootstrap();
      const entitiesStream = provider.getEntitiesStream();

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
      provider.getSchemasStream();

      expect(createTarEntryStream).toHaveBeenCalled();
      expect(createFilePathFactory).toHaveBeenCalledWith('schemas');
    });

    it('Returns a stream', async () => {
      const provider = createLocalFileDestinationProvider(providerOptions);

      await provider.bootstrap();
      const schemasStream = provider.getSchemasStream();

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
      provider.getLinksStream();

      expect(createTarEntryStream).toHaveBeenCalled();
      expect(createFilePathFactory).toHaveBeenCalledWith('links');
    });

    it('Returns a stream', async () => {
      const provider = createLocalFileDestinationProvider(providerOptions);

      await provider.bootstrap();
      const linksStream = provider.getLinksStream();

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
      provider.getConfigurationStream();

      expect(createTarEntryStream).toHaveBeenCalled();
      expect(createFilePathFactory).toHaveBeenCalledWith('configuration');
    });

    it('Returns a stream', async () => {
      const provider = createLocalFileDestinationProvider(providerOptions);

      await provider.bootstrap();
      const configurationStream = provider.getConfigurationStream();

      expect(configurationStream instanceof stream.Writable).toBeTruthy();
    });
  });
});
