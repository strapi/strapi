import type { Readable } from 'stream';

import fs from 'fs-extra';
import zip from 'zlib';
import tar from 'tar';
import path from 'path';
import { isEmpty, keyBy } from 'lodash/fp';
import { chain } from 'stream-chain';
import { pipeline, PassThrough } from 'stream';
import { parser } from 'stream-json/jsonl/Parser';
import type { Schema } from '@strapi/strapi';

import type { IAsset, IMetadata, ISourceProvider, ProviderType } from '../../../../types';

import { createDecryptionCipher } from '../../../utils/encryption';
import { collect } from '../../../utils/stream';
import { ProviderInitializationError, ProviderTransferError } from '../../../errors/providers';

type StreamItemArray = Parameters<typeof chain>[0];

/**
 * Constant for the metadata file path
 */
const METADATA_FILE_PATH = 'metadata.json';

/**
 * Provider options
 */
export interface ILocalFileSourceProviderOptions {
  file: {
    path: string;
  };

  encryption: {
    enabled: boolean;
    key?: string;
  };

  compression: {
    enabled: boolean;
  };
}

export const createLocalFileSourceProvider = (options: ILocalFileSourceProviderOptions) => {
  return new LocalFileSourceProvider(options);
};

/**
 * Note: in versions of the transfer engine <=4.9.0, exports were generated with windows paths
 * on Windows systems, and posix paths on posix systems.
 *
 * We now store all paths as posix, but need to leave a separator conversion for legacy purposes, and to
 * support manually-created tar files coming from Windows systems (ie, if a user creates a
 * backup file with a windows tar tool rather than using the `export` command)
 *
 * Because of this, export/import files may never contain files with a forward slash in the name, even escaped
 * */

// Check if the directory of a given filePath (which can be either posix or win32) resolves to the same as the given posix-format path posixDirName
const isDirPathEquivalent = (posixDirName: string, filePath: string) => {
  // if win32 convert to posix, then get dirname
  const normalizedDir = path.posix.dirname(filePath.split(path.win32.sep).join(path.posix.sep));

  return posixDirName === normalizedDir;
};

// Check if two file paths that can be either in posix or win32 format resolves to the same file
const isFilePathEquivalent = (fileA: string, fileB: string) => {
  // Check if paths appear to be win32 or posix, and if win32 convert to posix
  const normalizedPathA = fileA.split(path.win32.sep).join(path.posix.sep);
  const normalizedPathB = fileB.split(path.win32.sep).join(path.posix.sep);

  return !path.posix.relative(normalizedPathB, normalizedPathA).length;
};

class LocalFileSourceProvider implements ISourceProvider {
  type: ProviderType = 'source';

  name = 'source::local-file';

  options: ILocalFileSourceProviderOptions;

  #metadata?: IMetadata;

  constructor(options: ILocalFileSourceProviderOptions) {
    this.options = options;

    const { encryption } = this.options;

    if (encryption.enabled && encryption.key === undefined) {
      throw new Error('Missing encryption key');
    }
  }

  /**
   * Pre flight checks regarding the provided options, making sure that the file can be opened (decrypted, decompressed), etc.
   */
  async bootstrap() {
    const { path: filePath } = this.options.file;

    try {
      // Read the metadata to ensure the file can be parsed
      this.#metadata = await this.getMetadata();

      // TODO: we might also need to read the schema.jsonl files & implements a custom stream-check
    } catch (e) {
      if (this.options?.encryption?.enabled) {
        throw new ProviderInitializationError(
          `Key is incorrect or the file '${filePath}' is not a valid Strapi data file.`
        );
      }
      throw new ProviderInitializationError(`File '${filePath}' is not a valid Strapi data file.`);
    }

    if (!this.#metadata) {
      throw new ProviderInitializationError('Could not load metadata from Strapi data file.');
    }
  }

  async getMetadata() {
    if (this.#metadata) {
      return this.#metadata;
    }

    const backupStream = this.#getBackupStream();
    return this.#parseJSONFile<IMetadata>(backupStream, METADATA_FILE_PATH);
  }

  async getSchemas() {
    const schemas = await collect<Schema>(this.createSchemasReadStream());

    if (isEmpty(schemas)) {
      throw new ProviderInitializationError('Could not load schemas from Strapi data file.');
    }

    return keyBy('uid', schemas);
  }

  createEntitiesReadStream(): Readable {
    return this.#streamJsonlDirectory('entities');
  }

  createSchemasReadStream(): Readable {
    return this.#streamJsonlDirectory('schemas');
  }

  createLinksReadStream(): Readable {
    return this.#streamJsonlDirectory('links');
  }

  createConfigurationReadStream(): Readable {
    // NOTE: TBD
    return this.#streamJsonlDirectory('configuration');
  }

  createAssetsReadStream(): Readable | Promise<Readable> {
    const inStream = this.#getBackupStream();
    const outStream = new PassThrough({ objectMode: true });

    pipeline(
      [
        inStream,
        new tar.Parse({
          // find only files in the assets/uploads folder
          filter(filePath, entry) {
            if (entry.type !== 'File') {
              return false;
            }
            return isDirPathEquivalent('./assets/uploads', filePath);
          },
          onentry(entry) {
            // TODO: Check if we need to handle win32 paths here for the assets
            const { path: filePath, size = 0 } = entry;
            const file = path.basename(filePath);
            const asset: IAsset = {
              filename: file,
              filepath: filePath,
              stats: { size },
              stream: entry as unknown as Readable,
            };
            outStream.write(asset);
          },
        }),
      ],
      () => outStream.end()
    );

    return outStream;
  }

  #getBackupStream() {
    const { file, encryption, compression } = this.options;

    const streams: StreamItemArray = [];

    try {
      streams.push(fs.createReadStream(file.path));
    } catch (e) {
      throw new Error(`Could not read backup file path provided at "${this.options.file.path}"`);
    }

    if (encryption.enabled && encryption.key) {
      streams.push(createDecryptionCipher(encryption.key));
    }

    if (compression.enabled) {
      streams.push(zip.createGunzip());
    }

    return chain(streams);
  }

  #streamJsonlDirectory(directory: string) {
    const inStream = this.#getBackupStream();

    const outStream = new PassThrough({ objectMode: true });

    pipeline(
      [
        inStream,
        new tar.Parse({
          filter(filePath, entry) {
            if (entry.type !== 'File') {
              return false;
            }

            return isDirPathEquivalent(directory, filePath);
          },

          async onentry(entry) {
            const transforms = [
              // JSONL parser to read the data chunks one by one (line by line)
              parser({
                checkErrors: true,
              }),
              // The JSONL parser returns each line as key/value
              (line: { key: string; value: object }) => line.value,
            ];

            const stream = entry.pipe(chain(transforms));

            try {
              for await (const chunk of stream) {
                outStream.write(chunk);
              }
            } catch (e: unknown) {
              outStream.destroy(
                new ProviderTransferError(
                  `Error parsing backup files from backup file ${entry.path}: ${
                    (e as Error).message
                  }`,
                  {
                    details: {
                      error: e,
                    },
                  }
                )
              );
            }
          },
        }),
      ],
      async () => {
        // Manually send the 'end' event to the out stream
        // once every entry has finished streaming its content
        outStream.end();
      }
    );

    return outStream;
  }

  // For collecting an entire JSON file then parsing it, not for streaming JSONL
  async #parseJSONFile<T extends object>(fileStream: Readable, filePath: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      pipeline(
        [
          fileStream,
          // Custom backup archive parsing
          new tar.Parse({
            /**
             * Filter the parsed entries to only keep the one that matches the given filepath
             */
            filter(entryPath, entry) {
              if (entry.type !== 'File') {
                return false;
              }

              return isFilePathEquivalent(entryPath, filePath);
            },

            async onentry(entry) {
              // Collect all the content of the entry file
              const content = await entry.collect();

              try {
                // Parse from buffer to string to JSON
                const parsedContent = JSON.parse(content.toString());

                // Resolve the Promise with the parsed content
                resolve(parsedContent);
              } catch (e) {
                reject(e);
              } finally {
                // Cleanup (close the stream associated to the entry)
                entry.destroy();
              }
            },
          }),
        ],
        () => {
          // If the promise hasn't been resolved and we've parsed all
          // the archive entries, then the file doesn't exist
          reject(new Error(`File "${filePath}" not found`));
        }
      );
    });
  }
}
