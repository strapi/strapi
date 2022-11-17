import type { IDestinationProvider, IMetadata, ProviderType } from '../../types';

import fs from 'fs';
import path from 'path';
import tar from 'tar-stream';
import zlib from 'zlib';
import { Writable, Readable } from 'stream';
import { stringer } from 'stream-json/jsonl/Stringer';
import { chain } from 'stream-chain';

import { createEncryptionCipher } from '../encryption/encrypt';

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

export const createLocalFileDestinationProvider = (
  options: ILocalFileDestinationProviderOptions
) => {
  return new LocalFileDestinationProvider(options);
};

class LocalFileDestinationProvider implements IDestinationProvider {
  name: string = 'destination::local-file';
  type: ProviderType = 'destination';
  options: ILocalFileDestinationProviderOptions;

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

  bootstrap(): void | Promise<void> {
    const { compression, encryption } = this.options;

    if (encryption.enabled && !encryption.key) {
      throw new Error("Can't encrypt without a key");
    }

    this.#archive = tar.pack();

    const outStream = fs.createWriteStream(this.#archivePath);

    const archiveTransforms = [];

    if (compression.enabled) {
      archiveTransforms.push(zlib.createGzip());
    }

    if (encryption.enabled && encryption.key) {
      archiveTransforms.push(createEncryptionCipher(encryption.key));
    }

    chain([this.#archive, ...archiveTransforms, outStream]);
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

/**
 * Create a file path factory for a given path & prefix.
 * Upon being called, the factory will return a file path for a given index
 */
const createFilePathFactory =
  (type: string) =>
  (fileIndex: number = 0): string => {
    return path.join(
      // "{type}" directory
      type,
      // "${type}_XXXXX.jsonl" file
      `${type}_${String(fileIndex).padStart(5, '0')}.jsonl`
    );
  };

const createTarEntryStream = (
  archive: tar.Pack,
  pathFactory: (index?: number) => string,
  maxSize: number = 2.56e8
) => {
  let fileIndex = 0;
  let buffer = '';

  const flush = async () => {
    if (!buffer) {
      return;
    }

    const name = pathFactory(fileIndex++);
    const size = buffer.length;

    await new Promise<void>((resolve, reject) => {
      archive.entry({ name, size }, buffer, (err) => {
        if (err) {
          reject(err);
        }

        resolve();
      });
    });

    buffer = '';
  };

  const push = (chunk: string | Buffer) => {
    buffer += chunk;
  };

  return new Writable({
    async destroy(err, callback) {
      await flush();
      callback(err);
    },

    async write(chunk, _encoding, callback) {
      const size = chunk.length;

      if (chunk.length > maxSize) {
        callback(new Error(`payload too large: ${chunk.length}>${maxSize}`));
        return;
      }

      if (buffer.length + size > maxSize) {
        await flush();
      }

      push(chunk);

      callback(null);
    },
  });
};
