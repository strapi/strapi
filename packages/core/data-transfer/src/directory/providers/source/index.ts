import type { Readable } from 'stream';

import path from 'path';
import { PassThrough, pipeline } from 'stream';
import fs from 'fs-extra';
import { isEmpty, keyBy } from 'lodash/fp';
import { chain } from 'stream-chain';
import { parser } from 'stream-json/jsonl/Parser';
import type { Struct } from '@strapi/types';

import type { IAsset, IMetadata, ISourceProvider, ProviderType, IFile } from '../../../../types';

import * as utils from '../../../utils';
import { ProviderInitializationError, ProviderTransferError } from '../../../errors/providers';

/**
 * Constant for the metadata file path
 */
const METADATA_FILE_PATH = 'metadata.json';

/**
 * Provider options
 */
export interface ILocalDirectorySourceProviderOptions {
  directory: {
    path: string; // the directory to load files from
  };
}

export const createLocalDirectorySourceProvider = (
  options: ILocalDirectorySourceProviderOptions
) => {
  return new LocalDirectorySourceProvider(options);
};

class LocalDirectorySourceProvider implements ISourceProvider {
  type: ProviderType = 'source';

  name = 'source::local-directory';

  options: ILocalDirectorySourceProviderOptions;

  #metadata?: IMetadata;

  constructor(options: ILocalDirectorySourceProviderOptions) {
    this.options = options;
  }

  /**
   * Pre flight checks to ensure the directory exists and can be read.
   */
  async bootstrap() {
    const { path: directoryPath } = this.options.directory;

    try {
      // Check if the directory exists
      const stat = await fs.stat(directoryPath);
      if (!stat.isDirectory()) {
        throw new Error(`Path is not a directory: ${directoryPath}`);
      }
      // Load the metadata file
      await this.#loadMetadata();
    } catch (e) {
      throw new ProviderInitializationError(
        `Could not initialize provider: ${(e as Error).message}`
      );
    }

    if (!this.#metadata) {
      throw new ProviderInitializationError('Could not load metadata from the directory.');
    }
  }

  async #loadMetadata() {
    const metadataPath = path.join(this.options.directory.path, METADATA_FILE_PATH);
    this.#metadata = await this.#readJSONFile<IMetadata>(metadataPath);
  }

  async getMetadata() {
    if (!this.#metadata) {
      await this.#loadMetadata();
    }

    return this.#metadata ?? null;
  }

  async getSchemas() {
    const schemaCollection = await utils.stream.collect<Struct.Schema>(
      this.createSchemasReadStream()
    );

    if (isEmpty(schemaCollection)) {
      throw new ProviderInitializationError('Could not load schemas from the directory.');
    }

    // Group schema by UID
    const schemas = keyBy('uid', schemaCollection);

    // Transform to valid JSON
    return utils.schema.schemasToValidJSON(schemas);
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
    return this.#streamJsonlDirectory('configuration');
  }

  createAssetsReadStream(): Readable {
    const outStream = new PassThrough({ objectMode: true });
    const assetsDir = path.join(this.options.directory.path, 'assets/uploads');

    fs.readdir(assetsDir, { withFileTypes: true }, (err, files) => {
      if (err) {
        outStream.destroy(new ProviderTransferError(`Failed to read assets directory: ${err}`));
        return;
      }

      files
        .filter((file) => file.isFile())
        .forEach((file) => {
          const filePath = path.join(assetsDir, file.name);
          const metadataPath = path.join(
            this.options.directory.path,
            'assets/metadata',
            `${file.name}.json`
          );
          const size = fs.statSync(filePath).size;

          let metadata;
          try {
            metadata = fs.readJSONSync(metadataPath);
          } catch {
            console.warn(`Failed to read metadata for ${file.name}`);
          }

          const asset: IAsset = {
            metadata,
            filename: file.name,
            filepath: filePath,
            stats: { size },
            stream: fs.createReadStream(filePath),
          };

          outStream.write(asset);
        });

      outStream.end();
    });

    return outStream;
  }

  #streamJsonlDirectory(subDirectory: string): Readable {
    const fullPath = path.join(this.options.directory.path, subDirectory);
    const outStream = new PassThrough({ objectMode: true });

    fs.readdir(fullPath, { withFileTypes: true }, (err, files) => {
      if (err) {
        outStream.destroy(
          new ProviderTransferError(`Failed to read directory: ${fullPath}. Error: ${err}`)
        );
        return;
      }

      files
        .filter((file) => file.isFile() && file.name.endsWith('.jsonl'))
        .forEach((file) => {
          const filePath = path.join(fullPath, file.name);
          const readStream = fs.createReadStream(filePath);
          const parserStream = chain([
            parser({ checkErrors: true }),
            (line: { key: string; value: object }) => line.value,
          ]);

          pipeline(readStream, parserStream, outStream, (err) => {
            if (err) {
              outStream.destroy(new ProviderTransferError(`Error streaming JSONL: ${err}`));
            }
          });
        });
    });

    return outStream;
  }

  async #readJSONFile<T extends object>(filePath: string): Promise<T> {
    try {
      return await fs.readJSON(filePath);
    } catch (e) {
      throw new Error(`Failed to read JSON file at "${filePath}": ${(e as Error).message}`);
    }
  }
}
