import type { Readable } from 'stream';

import zip from 'zlib';
import path from 'path';
import { pipeline, PassThrough } from 'stream';
import fs from 'fs-extra';
import tar from 'tar';
import { isEmpty, keyBy } from 'lodash/fp';
import { chain } from 'stream-chain';
import { parser } from 'stream-json/jsonl/Parser';
import type { Struct } from '@strapi/types';

import type { IAsset, IMetadata, ISourceProvider, ProviderType, IFile } from '../../../../types';
import type { IDiagnosticReporter } from '../../../utils/diagnostic';

import * as utils from '../../../utils';
import { ProviderInitializationError, ProviderTransferError } from '../../../errors/providers';
import { isFilePathInDirname, isPathEquivalent, unknownPathToPosix } from './utils';

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
    path: string; // the file to load
  };

  encryption: {
    enabled: boolean; // if the file is encrypted (and should be decrypted)
    key?: string; // the key to decrypt the file
  };

  compression: {
    enabled: boolean; // if the file is compressed (and should be decompressed)
  };
}

export const createLocalFileSourceProvider = (options: ILocalFileSourceProviderOptions) => {
  return new LocalFileSourceProvider(options);
};

class LocalFileSourceProvider implements ISourceProvider {
  type: ProviderType = 'source';

  name = 'source::local-file';

  options: ILocalFileSourceProviderOptions;

  #metadata?: IMetadata;

  #diagnostics?: IDiagnosticReporter;

  constructor(options: ILocalFileSourceProviderOptions) {
    this.options = options;

    const { encryption } = this.options;

    if (encryption.enabled && encryption.key === undefined) {
      throw new Error('Missing encryption key');
    }
  }

  #reportInfo(message: string) {
    this.#diagnostics?.report({
      details: {
        createdAt: new Date(),
        message,
        origin: 'file-source-provider',
      },
      kind: 'info',
    });
  }

  /**
   * Pre flight checks regarding the provided options, making sure that the file can be opened (decrypted, decompressed), etc.
   */
  async bootstrap(diagnostics: IDiagnosticReporter) {
    this.#diagnostics = diagnostics;
    const { path: filePath } = this.options.file;

    try {
      // Read the metadata to ensure the file can be parsed
      await this.#loadMetadata();
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

  async #loadMetadata() {
    const backupStream = this.#getBackupStream();
    this.#metadata = await this.#parseJSONFile<IMetadata>(backupStream, METADATA_FILE_PATH);
  }

  async #loadAssetMetadata(path: string) {
    const backupStream = this.#getBackupStream();
    return this.#parseJSONFile<IFile>(backupStream, path);
  }

  async getMetadata() {
    this.#reportInfo('getting metadata');
    if (!this.#metadata) {
      await this.#loadMetadata();
    }

    return this.#metadata ?? null;
  }

  async getSchemas() {
    this.#reportInfo('getting schemas');
    const schemaCollection = await utils.stream.collect<Struct.Schema>(
      this.createSchemasReadStream()
    );

    if (isEmpty(schemaCollection)) {
      throw new ProviderInitializationError('Could not load schemas from Strapi data file.');
    }

    // Group schema by UID
    const schemas = keyBy('uid', schemaCollection);

    // Transform to valid JSON
    return utils.schema.schemasToValidJSON(schemas);
  }

  createEntitiesReadStream(): Readable {
    this.#reportInfo('creating entities read stream');
    return this.#streamJsonlDirectory('entities');
  }

  createSchemasReadStream(): Readable {
    this.#reportInfo('creating schemas read stream');
    return this.#streamJsonlDirectory('schemas');
  }

  createLinksReadStream(): Readable {
    this.#reportInfo('creating links read stream');
    return this.#streamJsonlDirectory('links');
  }

  createConfigurationReadStream(): Readable {
    this.#reportInfo('creating configuration read stream');
    // NOTE: TBD
    return this.#streamJsonlDirectory('configuration');
  }

  createAssetsReadStream(): Readable | Promise<Readable> {
    const inStream = this.#getBackupStream();
    const outStream = new PassThrough({ objectMode: true });
    const loadAssetMetadata = this.#loadAssetMetadata.bind(this);
    this.#reportInfo('creating assets read stream');

    pipeline(
      [
        inStream,
        new tar.Parse({
          // find only files in the assets/uploads folder
          filter(filePath, entry) {
            if (entry.type !== 'File') {
              return false;
            }
            return isFilePathInDirname('assets/uploads', filePath);
          },
          async onentry(entry) {
            const { path: filePath, size = 0 } = entry;
            const normalizedPath = unknownPathToPosix(filePath);
            const file = path.basename(normalizedPath);
            let metadata;
            try {
              metadata = await loadAssetMetadata(`assets/metadata/${file}.json`);
            } catch (error) {
              throw new Error(`Failed to read metadata for ${file}`);
            }
            const asset: IAsset = {
              metadata,
              filename: file,
              filepath: normalizedPath,
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
      streams.push(utils.encryption.createDecryptionCipher(encryption.key));
    }

    if (compression.enabled) {
      streams.push(zip.createGunzip());
    }

    return chain(streams);
  }

  // `directory` must be posix formatted path
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

            return isFilePathInDirname(directory, filePath);
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

              return isPathEquivalent(entryPath, filePath);
            },

            async onentry(entry) {
              // Collect all the content of the entry file
              const content = await entry.collect();

              try {
                // Parse from buffer array to string to JSON
                const parsedContent = JSON.parse(Buffer.concat(content).toString());

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
