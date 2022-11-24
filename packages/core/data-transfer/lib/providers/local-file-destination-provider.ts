import type {
  IDestinationProvider,
  IDestinationProviderTransferResults,
  IMetadata,
  ProviderType,
  Stream,
} from '../../types';

import fs from 'fs-extra';
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
  #archive: { stream?: tar.Pack; pipeline?: Stream } = {};

  constructor(options: ILocalFileDestinationProviderOptions) {
    this.options = options;
  }

  get #archivePath() {
    const { encryption, compression, file } = this.options;

    let path = `${file.path}.tar`;

    if (compression.enabled) {
      path += '.gz';
    }

    if (encryption.enabled) {
      path += '.enc';
    }

    return path;
  }

  setMetadata(target: ProviderType, metadata: IMetadata): IDestinationProvider {
    this.#providersMetadata[target] = metadata;

    return this;
  }

  #getDataTransformers(options: { jsonl?: boolean } = {}) {
    const { jsonl = true } = options;
    const transforms: Stream[] = [];

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

    this.#archive.stream = tar.pack();

    const outStream = fs.createWriteStream(this.#archivePath);

    const archiveTransforms: Stream[] = [];

    if (compression.enabled) {
      archiveTransforms.push(zlib.createGzip());
    }

    if (encryption.enabled && encryption.key) {
      archiveTransforms.push(createEncryptionCipher(encryption.key));
    }

    this.#archive.pipeline = chain([this.#archive.stream, ...archiveTransforms, outStream]);

    this.results.file = { path: this.#archivePath };
  }

  async close() {
    const { stream, pipeline } = this.#archive;

    if (!stream) {
      return;
    }

    await this.#writeMetadata();
    stream.finalize();

    if (pipeline && !pipeline.closed) {
      await new Promise<void>((resolve, reject) => {
        pipeline.on('close', resolve).on('error', reject);
      });
    }
  }

  async rollback(): Promise<void> {
    await this.close();
    fs.rmSync(this.#archivePath, { force: true });
  }

  getMetadata() {
    return null;
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
    const { stream } = this.#archive;

    if (!stream) {
      throw new Error('Archive stream is unavailable');
    }

    return createTarEntryStream(stream, () => 'metadata.json');
  }

  getSchemasStream() {
    if (!this.#archive.stream) {
      throw new Error('Archive stream is unavailable');
    }

    const filePathFactory = createFilePathFactory('schemas');

    const entryStream = createTarEntryStream(
      this.#archive.stream,
      filePathFactory,
      this.options.file.maxSize
    );

    return chain([stringer(), entryStream]);
  }

  getEntitiesStream(): NodeJS.WritableStream {
    if (!this.#archive.stream) {
      throw new Error('Archive stream is unavailable');
    }

    const filePathFactory = createFilePathFactory('entities');

    const entryStream = createTarEntryStream(
      this.#archive.stream,
      filePathFactory,
      this.options.file.maxSize
    );

    return chain([stringer(), entryStream]);
  }

  getLinksStream(): NodeJS.WritableStream {
    if (!this.#archive.stream) {
      throw new Error('Archive stream is unavailable');
    }

    const filePathFactory = createFilePathFactory('links');

    const entryStream = createTarEntryStream(
      this.#archive.stream,
      filePathFactory,
      this.options.file.maxSize
    );

    return chain([stringer(), entryStream]);
  }

  getConfigurationStream(): NodeJS.WritableStream {
    if (!this.#archive.stream) {
      throw new Error('Archive stream is unavailable');
    }

    const filePathFactory = createFilePathFactory('configuration');

    const entryStream = createTarEntryStream(
      this.#archive.stream,
      filePathFactory,
      this.options.file.maxSize
    );

    return chain([stringer(), entryStream]);
  }

  getAssetsStream(): NodeJS.WritableStream {
    const { stream: archiveStream } = this.#archive;

    if (!archiveStream) {
      throw new Error('Archive stream is unavailable');
    }

    return new Writable({
      objectMode: true,
      write(data, _encoding, callback) {
        const entryPath = path.join('assets', 'uploads', data.file);

        const entry = archiveStream.entry({
          name: entryPath,
          size: data.stats.size,
        });

        if (!entry) {
          callback(new Error(`Failed to created a tar entry for ${entryPath}`));
          return;
        }

        data.stream.pipe(entry);

        entry
          .on('finish', () => {
            callback(null);
          })
          .on('error', (error) => {
            callback(error);
          });
      },
    });
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
