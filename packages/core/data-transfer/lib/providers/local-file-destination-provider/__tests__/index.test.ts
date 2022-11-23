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

      expect(provider.results.file.path).toEqual(`${filePath}.tar.gz`);
    });

    it('Adds .gpg extension to the archive path when encryption is enabled', async () => {
      const providerOptions: ILocalFileDestinationProviderOptions = {
        encryption: { enabled: true, key: 'key' },
        compression: { enabled: false },
        file: { path: filePath },
      };
      const provider = createLocalFileDestinationProvider(providerOptions);

      await provider.bootstrap();

      expect(provider.results.file.path).toEqual(`${filePath}.tar.gpg`);
    });

    it('Adds .gz.gpg extension to the archive path when encryption and compression are enabled', async () => {
      const providerOptions: ILocalFileDestinationProviderOptions = {
        encryption: { enabled: true, key: 'key' },
        compression: { enabled: true },
        file: { path: filePath },
      };
      const provider = createLocalFileDestinationProvider(providerOptions);

      await provider.bootstrap();

      expect(provider.results.file.path).toEqual(`${filePath}.tar.gz.gpg`);
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
    it('Creates a tar entry stream', () => {
      const providerOptions: ILocalFileDestinationProviderOptions = {
        encryption: { enabled: false },
        compression: { enabled: false },
        file: { path: filePath },
      };

      const provider = createLocalFileDestinationProvider(providerOptions);
      (createTarEntryStream as jest.Mock).mockImplementation(jest.fn());
      provider.getEntitiesStream();

      expect(createTarEntryStream).toHaveBeenCalled();
      expect(createFilePathFactory).toHaveBeenCalledWith('entities');
    });
  });

  describe('Streaming schemas', () => {
    it('Creates a tar entry stream for schemas', () => {
      const providerOptions: ILocalFileDestinationProviderOptions = {
        encryption: { enabled: false },
        compression: { enabled: false },
        file: { path: filePath },
      };

      const provider = createLocalFileDestinationProvider(providerOptions);
      (createTarEntryStream as jest.Mock).mockImplementation(jest.fn());
      provider.getSchemasStream();

      expect(createTarEntryStream).toHaveBeenCalled();
      expect(createFilePathFactory).toHaveBeenCalledWith('schemas');
    });
  });

  describe('Streaming links', () => {
    it('Creates a tar entry stream for links', () => {
      const providerOptions: ILocalFileDestinationProviderOptions = {
        encryption: { enabled: false },
        compression: { enabled: false },
        file: { path: filePath },
      };

      const provider = createLocalFileDestinationProvider(providerOptions);
      (createTarEntryStream as jest.Mock).mockImplementation(jest.fn());
      provider.getLinksStream();

      expect(createTarEntryStream).toHaveBeenCalled();
      expect(createFilePathFactory).toHaveBeenCalledWith('links');
    });
  });

  describe('Streaming configuration', () => {
    it('Creates a tar entry stream for configuration', () => {
      const providerOptions: ILocalFileDestinationProviderOptions = {
        encryption: { enabled: false },
        compression: { enabled: false },
        file: { path: filePath },
      };

      const provider = createLocalFileDestinationProvider(providerOptions);
      (createTarEntryStream as jest.Mock).mockImplementation(jest.fn());
      provider.getConfigurationStream();

      expect(createTarEntryStream).toHaveBeenCalled();
      expect(createFilePathFactory).toHaveBeenCalledWith('configuration');
    });
  });
});
