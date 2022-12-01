import fs from 'fs-extra';
import tar from 'tar-stream';
import path from 'path';
import zlib from 'zlib';
import { Readable } from 'stream';
import { stringer } from 'stream-json/jsonl/Stringer';
import { chain, Writable } from 'stream-chain';

import { createEncryptionCipher } from '../../encryption/encrypt';
import type {
  IDestinationProvider,
  IDestinationProviderTransferResults,
  IMetadata,
  ProviderType,
  Stream,
} from '../../../types';
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
  name = 'destination::local-file';

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

    let filePath = `${file.path}.tar`;

    if (compression.enabled) {
      filePath += '.gz';
    }

    if (encryption.enabled) {
      filePath += '.enc';
    }

    return filePath;
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

  createGzip(): zlib.Gzip {
    return zlib.createGzip();
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
      archiveTransforms.push(this.createGzip());
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
      this.options.file.maxSizeJsonl
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
      this.options.file.maxSizeJsonl
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
      this.options.file.maxSizeJsonl
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
      this.options.file.maxSizeJsonl
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
