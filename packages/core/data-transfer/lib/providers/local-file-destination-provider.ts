import type {
  IDestinationProvider,
  IDestinationProviderTransferResults,
  ProviderType,
  IMetadata,
} from '../../types';

import fs from 'fs-extra';
import path from 'path';
import zip from 'zlib';
import { Writable, Readable } from 'stream';
import { chain } from 'stream-chain';
import { stringer } from 'stream-json/jsonl/Stringer';

import { createEncryptionCipher } from '../encryption/encrypt';

export interface ILocalFileDestinationProviderOptions {
  // Encryption
  encryption: {
    enabled: boolean;
    key?: string;
  };

  // Compressions
  compression: {
    enabled: boolean;
  };

  // Archive
  archive: {
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

    // Compression
    if (this.options.compression.enabled) {
      transforms.push(zip.createGzip());
    }

    // Encryption
    if (this.options.encryption.enabled) {
      if (!this.options.encryption.key) {
        throw new Error("Can't encrypt without a key");
      }

      const cipher = createEncryptionCipher(this.options.encryption.key);

      transforms.push(cipher);
    }

    return transforms;
  }

  bootstrap(): void | Promise<void> {
    const rootDir = this.options.file.path;
    const dirExists = fs.pathExistsSync(rootDir);

    if (dirExists) {
      throw new Error('File with that name already exists');
    }

    if (this.options.encryption.enabled) {
      if (!this.options.encryption.key) {
        throw new Error("Can't encrypt without a key");
      }
    }

    fs.mkdirSync(rootDir, { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'schemas'));
    fs.mkdirSync(path.join(rootDir, 'entities'));
    fs.mkdirSync(path.join(rootDir, 'links'));
    fs.mkdirSync(path.join(rootDir, 'media'));
    fs.mkdirSync(path.join(rootDir, 'configuration'));

    this.results.file = { path: this.options.file.path };
  }

  async close(): Promise<void> {
    await this.#writeMetadata();
    this.results.file = { path: this.options.file.path };
  }

  rollback(): void {
    fs.rmSync(this.options.file.path, { force: true, recursive: true });
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
    const metadataPath = path.join(this.options.file.path, 'metadata.json');

    // Transform streams
    const transforms: Writable[] = this.#getDataTransformers({ jsonl: false });

    // FS write stream
    const fileStream = fs.createWriteStream(metadataPath);

    // Full pipeline
    const streams = transforms.concat(fileStream);

    return chain(streams);
  }

  getSchemasStream() {
    const filePathFactory = createFilePathFactory(this.options.file.path, 'schemas');

    // Transform streams
    const transforms: Writable[] = this.#getDataTransformers();

    // FS write stream
    const fileStream = createMultiFilesWriteStream(filePathFactory, this.options.file.maxSizeJsonl);

    // Full pipeline
    const streams = transforms.concat(fileStream);

    return chain(streams);
  }

  getEntitiesStream(): NodeJS.WritableStream {
    const filePathFactory = createFilePathFactory(this.options.file.path, 'entities');

    // Transform streams
    const transforms: Writable[] = this.#getDataTransformers();

    // FS write stream
    const fileStream = createMultiFilesWriteStream(filePathFactory, this.options.file.maxSize);

    // Full pipeline
    const streams = transforms.concat(fileStream);

    return chain(streams);
  }

  getLinksStream(): NodeJS.WritableStream {
    const filePathFactory = createFilePathFactory(this.options.file.path, 'links');

    // Transform streams
    const transforms: Writable[] = this.#getDataTransformers();

    // FS write stream
    const fileStream = createMultiFilesWriteStream(filePathFactory, this.options.file.maxSizeJsonl);

    // Full pipelines
    const streams = transforms.concat(fileStream);

    return chain(streams);
  }

  getConfigurationStream(): NodeJS.WritableStream {
    const filePathFactory = createFilePathFactory(this.options.file.path, 'configuration');

    // Transform streams
    const transforms: Writable[] = this.#getDataTransformers();

    // FS write stream
    const fileStream = createMultiFilesWriteStream(filePathFactory, this.options.file.maxSize);

    // Full pipeline
    const streams = transforms.concat(fileStream);

    return chain(streams);
  }

  getMediaStream(): NodeJS.WritableStream {
    return chain([
      (data) => {
        console.log(data.file);
        return data;
      },
      (data) => {
        const fsStream = fs.createWriteStream(path.join(this.options.file.path, data.file));
        data.stream.pipe(fsStream);
        fsStream.on('close', () => {
          console.log('closed', data.file);
          data.stream.destroy();
        });
        return data;
      },
    ]);
  }
}

/**
 * Create a writable stream that can split the streamed data into
 * multiple files based on a provided maximum file size value.
 */
const createMultiFilesWriteStream = (
  filePathFactory: (index?: number) => string,
  maxFileSize?: number
): Writable => {
  let fileIndex = 0;
  let fileSize = 0;
  let maxSize = maxFileSize;

  let writeStream: fs.WriteStream;

  const createIndexedWriteStream = () => fs.createWriteStream(filePathFactory(fileIndex));

  // If no maximum file size is provided, then return a basic fs write stream
  if (maxFileSize === undefined) {
    return createIndexedWriteStream();
  }

  if (maxFileSize <= 0) {
    throw new Error('Max file size must be a positive number');
  }

  return new Writable({
    write(chunk, encoding, callback) {
      // Initialize the write stream value if undefined
      if (!writeStream) {
        writeStream = createIndexedWriteStream();
      }

      // Check that by adding this new chunk of data, we
      // are not going to reach the maximum file size.
      if (maxSize && fileSize + chunk.length > maxSize) {
        // Update the counters' value
        fileIndex++;
        fileSize = 0;

        // Replace old write stream
        writeStream.destroy();
        writeStream = createIndexedWriteStream();
      }

      // Update the actual file size
      fileSize += chunk.length;

      // Transfer the data to the up-to-date write stream
      writeStream.write(chunk, encoding, callback);
    },
  });
};

/**
 * Create a file path factory for a given path & prefix.
 * Upon being called, the factory will return a file path for a given index
 */
const createFilePathFactory =
  (src: string, directory: string, prefix: string = directory) =>
  (fileIndex: number = 0): string => {
    return path.join(
      // Backup path
      src,
      // "{directory}/" directory
      directory,
      // "${prefix}_XXXXX.jsonl" file
      `${prefix}_${String(fileIndex).padStart(5, '0')}.jsonl`
    );
  };
