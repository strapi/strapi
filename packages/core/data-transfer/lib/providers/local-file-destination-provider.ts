import fs from 'fs';
import path from 'path';
import zip from 'zlib';
import { Duplex } from 'stream';
import { chain } from 'stream-chain';
import { stringer } from 'stream-json/jsonl/Stringer';

import { IDestinationProvider, ProviderType, Stream } from '../../types';
// import { encrypt } from '../encryption';

export interface ILocalFileDestinationProviderOptions {
  backupFilePath: string;

  // Encryption
  encrypted?: boolean;
  encryptionKey?: string;
}

export class LocalFileDestinationProvider implements IDestinationProvider {
  name: string = 'provider::destination.local-file';
  type: ProviderType = 'destination';
  options: ILocalFileDestinationProviderOptions;

  constructor(options: ILocalFileDestinationProviderOptions) {
    this.options = options;
  }

  bootstrap(): void | Promise<void> {
    const rootDir = this.options.backupFilePath;
    const dirExists = fs.existsSync(rootDir);

    if (dirExists) {
      fs.rmSync(rootDir, { force: true, recursive: true });
    }

    fs.mkdirSync(rootDir, { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'entities'));
    fs.mkdirSync(path.join(rootDir, 'links'));
    fs.mkdirSync(path.join(rootDir, 'media'));
    fs.mkdirSync(path.join(rootDir, 'configuration'));
  }

  rollback(): void | Promise<void> {
    fs.rmSync(this.options.backupFilePath, { force: true, recursive: true });
  }

  getMetadata() {
    return null;
  }

  getEntitiesStream(): Duplex {
    const options = {
      encryption: {
        enabled: true,
        key: 'Hello World!',
      },
      compression: {
        enabled: false,
      },
      file: {
        maxSize: 100000,
      },
    };

    const filePathFactory = (fileIndex: number = 0) => {
      return path.join(
        // Backup path
        this.options.backupFilePath,
        // "entities/" directory
        'entities',
        // "entities_00000.jsonl" file
        `entities_${String(fileIndex).padStart(5, '0')}.jsonl`
      );
    };

    const streams: any[] = [
      // create jsonl strings from object entities
      stringer(),
    ];

    // Compression
    if (options.compression?.enabled) {
      streams.push(zip.createGzip());
    }

    // Encryption
    // if (options.encryption?.enabled) {
    //   streams.push(encrypt(options.encryption.key).cipher());
    // }

    // FS write stream
    streams.push(createMultiFilesWriteStream(filePathFactory, options.file?.maxSize));

    return chain(streams);
  }

  getLinksStream(): Duplex | Promise<Duplex> {
    const options = {
      encryption: {
        enabled: true,
        key: 'Hello World!',
      },
      compression: {
        enabled: false,
      },
      file: {
        maxSize: 100000,
      },
    };

    const filePathFactory = (fileIndex: number = 0) => {
      return path.join(
        // Backup path
        this.options.backupFilePath,
        // "links/" directory
        'links',
        // "links_00000.jsonl" file
        `links_${String(fileIndex).padStart(5, '0')}.jsonl`
      );
    };

    const streams: any[] = [
      // create jsonl strings from object links
      stringer(),
    ];

    // Compression
    if (options.compression?.enabled) {
      streams.push(zip.createGzip());
    }

    // Encryption
    // if (options.encryption?.enabled) {
    //   streams.push(encrypt(options.encryption.key).cipher());
    // }

    // FS write stream
    streams.push(createMultiFilesWriteStream(filePathFactory, options.file?.maxSize));

    return chain(streams);
  }
}

/**
 * Create a writable stream that can split the streamed data into
 * multiple files based on a provided maximum file size value.
 */
const createMultiFilesWriteStream = (
  filePathFactory: (index?: number) => string,
  maxFileSize?: number
): WritableStream => {
  let fileIndex = 0;
  let fileSize = 0;
  let maxSize = maxFileSize;

  let writeStream: Duplex;

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
      if (fileSize + chunk.length > maxSize) {
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
