import { rm, createWriteStream } from 'fs-extra';
import tar from 'tar-stream';
import path from 'path';
import zlib from 'zlib';
import { stringer } from 'stream-json/jsonl/Stringer';
import { chain } from 'stream-chain';
import { Readable, Writable } from 'stream';

import { createEncryptionCipher } from '../../../utils/encryption';
import type {
  IAsset,
  IDestinationProvider,
  IDestinationProviderTransferResults,
  IMetadata,
  ProviderType,
  Stream,
} from '../../../../types';
import { createFilePathFactory, createTarEntryStream } from './utils';
import { ProviderTransferError } from '../../../errors/providers';

export interface ILocalFileDestinationProviderOptions {
  encryption: {
    enabled: boolean;
    key?: string;
  };

  compression: {
    enabled: boolean;
  };

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

  createGzip(): zlib.Gzip {
    return zlib.createGzip();
  }

  bootstrap(): void | Promise<void> {
    const { compression, encryption } = this.options;

    if (encryption.enabled && !encryption.key) {
      throw new Error("Can't encrypt without a key");
    }

    this.#archive.stream = tar.pack();

    const outStream = createWriteStream(this.#archivePath);

    outStream.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOSPC') {
        throw new ProviderTransferError(
          "Your server doesn't have space to proceed with the import."
        );
      }
      throw err;
    });

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
    await rm(this.#archivePath, { force: true });
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

  createSchemasWriteStream() {
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

  createEntitiesWriteStream(): Writable {
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

  createLinksWriteStream(): Writable {
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

  createConfigurationWriteStream(): Writable {
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

  createAssetsWriteStream(): Writable {
    const { stream: archiveStream } = this.#archive;

    if (!archiveStream) {
      throw new Error('Archive stream is unavailable');
    }

    return new Writable({
      objectMode: true,
      write(data: IAsset, _encoding, callback) {
        // always write tar files with posix paths so we have a standard format for paths regardless of system
        const entryPath = path.posix.join('assets', 'uploads', data.filename);

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
