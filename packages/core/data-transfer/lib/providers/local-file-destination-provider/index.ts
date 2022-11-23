import type {
  IDestinationProvider,
  IDestinationProviderTransferResults,
  IMetadata,
  ProviderType,
} from '../../../types';

import { Readable } from 'stream';
import fs from 'fs-extra';
import tar from 'tar-stream';
import zlib from 'zlib';
import { stringer } from 'stream-json/jsonl/Stringer';
import { chain } from 'stream-chain';

import { createEncryptionCipher } from '../../encryption/encrypt';
import { createFilePathFactory, createTarEntryStream } from './utils';

export interface ILocalFileDestinationProviderOptions {
  // Encryption
  encryption: {
    enabled: boolean;
    key?: string;
  };

  // Compression
  compression: {
    enabled: boolean;
  };

  // File
  file: {
    path: string;
    maxSize?: number;
    maxSizeJsonl?: number;
  };
}

export interface ILocalFileDestinationProviderTransferResults
  extends IDestinationProviderTransferResults {
  file?: {
    path?: string;
  };
}

export const createLocalFileDestinationProvider = (
  options: ILocalFileDestinationProviderOptions
) => {
  return new LocalFileDestinationProvider(options);
};

class LocalFileDestinationProvider implements IDestinationProvider {
  name: string = 'destination::local-file';
  type: ProviderType = 'destination';
  options: ILocalFileDestinationProviderOptions;
  results: ILocalFileDestinationProviderTransferResults = {};

  #providersMetadata: { source?: IMetadata; destination?: IMetadata } = {};
  #archive?: tar.Pack;

  constructor(options: ILocalFileDestinationProviderOptions) {
    this.options = options;
  }

  setMetadata(target: ProviderType, metadata: IMetadata): IDestinationProvider {
    this.#providersMetadata[target] = metadata;

    return this;
  }

  #getDataTransformers(options: { jsonl?: boolean } = {}) {
    const { jsonl = true } = options;
    const transforms = [];

    if (jsonl) {
      // Convert to stringified JSON lines
      transforms.push(stringer());
    }

    return transforms;
  }

  createGzip(): zlib.Gzip {
    return zlib.createGzip();
  }

  bootstrap(): void | Promise<void> {
    const { compression, encryption } = this.options;

    if (encryption.enabled && !encryption.key) {
      throw new Error("Can't encrypt without a key");
    }

    this.#archive = tar.pack();

    const outStream = fs.createWriteStream(this.#archivePath);

    const archiveTransforms = [];

    if (compression.enabled) {
      archiveTransforms.push(this.createGzip());
    }

    if (encryption.enabled && encryption.key) {
      archiveTransforms.push(createEncryptionCipher(encryption.key));
    }

    chain([this.#archive, ...archiveTransforms, outStream]);
    this.results.file = { path: this.#archivePath };
  }

  async close() {
    await this.#writeMetadata();
    this.#archive?.finalize();
  }

  async rollback(): Promise<void> {
    await this.close();
    fs.rmSync(this.#archivePath, { force: true });
  }

  getMetadata() {
    return null;
  }

  get #archivePath() {
    const { encryption, compression, file } = this.options;

    let path = `${file.path}.tar`;

    if (compression.enabled) {
      path += '.gz';
    }

    if (encryption.enabled) {
      path += '.gpg';
    }

    return path;
  }

  async #writeMetadata(): Promise<void> {
    const metadata = this.#providersMetadata.source;

    if (metadata) {
      await new Promise((resolve) => {
        const outStream = this.#getMetadataStream();
        const data = JSON.stringify(metadata, null, 2);

        Readable.from(data).pipe(outStream).on('close', resolve);
      });
    }
  }

  #getMetadataStream() {
    return createTarEntryStream(this.#archive!, () => 'metadata.json');
  }

  getSchemasStream() {
    // const filePathFactory = createFilePathFactory(this.options.file.path, 'schemas');
    const filePathFactory = createFilePathFactory('schemas');

    // FS write stream
    const entryStream = createTarEntryStream(
      this.#archive!,
      filePathFactory,
      this.options.file.maxSize
    );

    return chain([stringer(), entryStream]);
  }

  getEntitiesStream(): NodeJS.WritableStream {
    // const filePathFactory = createFilePathFactory(this.options.file.path, 'entities');
    const filePathFactory = createFilePathFactory('entities');

    // FS write stream
    const entryStream = createTarEntryStream(
      this.#archive!,
      filePathFactory,
      this.options.file.maxSize
    );

    return chain([stringer(), entryStream]);
  }

  getLinksStream(): NodeJS.WritableStream {
    const filePathFactory = createFilePathFactory('links');

    // FS write stream
    const entryStream = createTarEntryStream(
      this.#archive!,
      filePathFactory,
      this.options.file.maxSize
    );

    return chain([stringer(), entryStream]);
  }

  getConfigurationStream(): NodeJS.WritableStream {
    const filePathFactory = createFilePathFactory('configuration');

    // FS write stream
    const entryStream = createTarEntryStream(
      this.#archive!,
      filePathFactory,
      this.options.file.maxSize
    );

    return chain([stringer(), entryStream]);
  }
}
