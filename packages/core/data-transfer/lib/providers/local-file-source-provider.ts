import type { Readable } from 'stream';

import fs from 'fs';
import zip from 'zlib';
import tar from 'tar';
import { keyBy } from 'lodash/fp';
import { chain } from 'stream-chain';
import { pipeline, PassThrough } from 'stream';
import { parser } from 'stream-json/jsonl/Parser';
import type { IMetadata, ISourceProvider, ProviderType } from '../../types';

import { createDecryptionCipher } from '../encryption';
import { collect } from '../utils';

type StreamItemArray = Parameters<typeof chain>[0];

/**
 * Constant for the metadata file path
 */
const METADATA_FILE_PATH = 'metadata.json';

/**
 * Provider options
 */
export interface ILocalFileSourceProviderOptions {
  /**
   * Path to the backup archive
   */
  backupFilePath: string;

  /**
   * Whether the backup data is encrypted or not
   */
  encrypted?: boolean;

  /**
   * Encryption key used to decrypt the encrypted data (if necessary)
   */
  encryptionKey?: string;

  /**
   * Whether the backup data is compressed or not
   */
  compressed?: boolean;
}

export const createLocalFileSourceProvider = (options: ILocalFileSourceProviderOptions) => {
  return new LocalFileSourceProvider(options);
};

class LocalFileSourceProvider implements ISourceProvider {
  type: ProviderType = 'source';

  name = 'source::local-file';

  options: ILocalFileSourceProviderOptions;

  constructor(options: ILocalFileSourceProviderOptions) {
    this.options = options;

    if (this.options.encrypted && this.options.encryptionKey === undefined) {
      throw new Error('Missing encryption key');
    }
  }

  /**
   * Pre flight checks regarding the provided options (making sure that the provided path is correct, etc...)
   */
  bootstrap() {
    const path = this.options.backupFilePath;
    const isValidBackupPath = fs.existsSync(path);

    // Check if the provided path exists
    if (!isValidBackupPath) {
      throw new Error(
        `Invalid backup file path provided. "${path}" does not exist on the filesystem.`
      );
    }
  }

  getMetadata() {
    // TODO: need to read the file & extract the metadata json file
    // => we might also need to read the schema.jsonl files & implements a custom stream-check
    const backupStream = this.#getBackupStream();
    return this.#parseJSONFile<IMetadata>(backupStream, METADATA_FILE_PATH);
  }

  async getSchemas() {
    const schemas = await collect(this.streamSchemas() as Readable);

    return keyBy('uid', schemas);
  }

  streamEntities(): NodeJS.ReadableStream {
    return this.#streamJsonlDirectory('entities');
  }

  streamSchemas(): NodeJS.ReadableStream | Promise<NodeJS.ReadableStream> {
    return this.#streamJsonlDirectory('schemas');
  }

  streamLinks(): NodeJS.ReadableStream {
    return this.#streamJsonlDirectory('links');
  }

  streamConfiguration(): NodeJS.ReadableStream {
    // NOTE: TBD
    return this.#streamJsonlDirectory('configuration');
  }

  #getBackupStream(decompress = true) {
    const path = this.options.backupFilePath;
    const readStream = fs.createReadStream(path);
    const streams: StreamItemArray = [readStream];

    // Handle decompression
    if (decompress) {
      streams.push(zip.createGunzip());
    }

    return chain(streams);
  }

  #streamJsonlDirectory(directory: string) {
    const options = this.options;
    const inStream = this.#getBackupStream();

    const outStream = new PassThrough({ objectMode: true });

    pipeline(
      [
        inStream,
        new tar.Parse({
          filter(path, entry) {
            if (entry.type !== 'File') {
              return false;
            }

            const parts = path.split('/');

            if (parts.length !== 2) {
              return false;
            }

            return parts[0] === directory;
          },

          onentry(entry) {
            const transforms = [];

            if (options.encrypted) {
              transforms.push(createDecryptionCipher(options.encryptionKey!));
            }

            if (options.compressed) {
              transforms.push(zip.createGunzip());
            }

            transforms.push(
              // JSONL parser to read the data chunks one by one (line by line)
              parser(),
              // The JSONL parser returns each line as key/value
              (line: { key: string; value: any }) => line.value
            );

            entry
              // Pipe transforms
              .pipe(chain(transforms))
              // Pipe the out stream to the whole pipeline
              // DO NOT send the 'end' event when this entry has finished
              // emitting data, so that it doesn't close the out stream
              .pipe(outStream, { end: false });
          },
        }),
      ],
      () => {
        // Manually send the 'end' event to the out stream
        // once every entry has finished streaming its content
        outStream.end();
      }
    );

    return outStream;
  }

  async #parseJSONFile<T extends Record<string, any> = any>(
    fileStream: NodeJS.ReadableStream,
    filePath: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      pipeline(
        [
          fileStream,
          // Custom backup archive parsing
          new tar.Parse({
            /**
             * Filter the parsed entries to only keep the one that matches the given filepath
             */
            filter(path, entry) {
              return path === filePath && entry.type === 'File';
            },

            /**
             * Whenever an entry passes the filter method, process it
             */
            async onentry(entry) {
              // Collect all the content of the entry file
              const content = await entry.collect();
              // Parse from buffer to string to JSON
              const parsedContent = JSON.parse(content.toString());

              // Resolve the Promise with the parsed content
              resolve(parsedContent);

              // Cleanup (close the stream associated to the entry)
              entry.destroy();
            },
          }),
        ],
        () => {
          // If the promise hasn't been resolved and we've parsed all
          // the archive entries, then the file doesn't exist
          reject(new Error(`${filePath} not found in the archive stream`));
        }
      );
    });
  }
}
