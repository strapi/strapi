import type { Struct } from '@strapi/types';

import fs from 'fs-extra';
import path from 'path';
import { PassThrough, pipeline, Readable } from 'stream';
import { chain } from 'stream-chain';
import { isEmpty, keyBy } from 'lodash/fp';
import { parser } from 'stream-json/jsonl/Parser';

import type {
  IAsset,
  IFile,
  IMetadata,
  ISourceProvider,
  ProviderType,
  StreamItem,
} from '../../../../types';

import { ProviderInitializationError, ProviderTransferError } from '../../../errors/providers';
import * as utils from '../../../utils';

/**
 * Constant for the metadata path
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
   * Pre-flight checks to ensure the directory exists and can be read.
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

  async getMetadata() {
    if (!this.#metadata) {
      await this.#loadMetadata();
    }

    return this.#metadata ?? null;
  }

  async getSchemas() {
    const schemaStream = await this.createSchemasReadStream();
    const schemaCollection = await utils.stream.collect<Struct.Schema>(schemaStream);

    if (isEmpty(schemaCollection)) {
      throw new ProviderInitializationError('Could not load schemas from the directory.');
    }

    // Group schema by UID
    const schemas = keyBy('uid', schemaCollection);

    // Transform to valid JSON
    return utils.schema.schemasToValidJSON(schemas);
  }

  createEntitiesReadStream(): Promise<Readable> {
    return this.#streamJsonlDirectory('entities');
  }

  createSchemasReadStream(): Promise<Readable> {
    return this.#streamJsonlDirectory('schemas');
  }

  createLinksReadStream(): Promise<Readable> {
    return this.#streamJsonlDirectory('links');
  }

  createConfigurationReadStream(): Promise<Readable> {
    return this.#streamJsonlDirectory('configuration');
  }

  createAssetsReadStream(): Promise<Readable> {
    const assetsDir = path.join(this.options.directory.path, 'assets/uploads');

    const mapDirentToAssetTransform = utils.stream.map<fs.Dirent, IAsset>((entry) => {
      let filepath = path.join(assetsDir, entry.name);

      const { size } = fs.statSync(filepath);
      const stream = fs.createReadStream(filepath);

      return { filename: entry.name, filepath, stats: { size }, stream } satisfies IAsset;
    });

    const loadAssetMetadataTransform = utils.stream.map<IAsset, IAsset>(async (asset) => {
      const metadataPath = path.join(
        this.options.directory.path,
        'assets/metadata',
        `${asset.filename}.json`
      );

      try {
        asset.metadata = await this.#readJSONFile<IFile>(metadataPath);
      } catch (e) {
        console.warn(`Failed to read metadata for ${asset.filename}`);
      }

      return asset;
    });

    return this.#streamDirectory(assetsDir, [
      mapDirentToAssetTransform,
      loadAssetMetadataTransform,
    ]);
  }

  async #loadMetadata() {
    const metadataPath = path.join(this.options.directory.path, METADATA_FILE_PATH);
    this.#metadata = await this.#readJSONFile<IMetadata>(metadataPath);
  }

  async #streamJsonlDirectory(subDirectory: string): Promise<Readable> {
    const fullPath = path.join(this.options.directory.path, subDirectory);

    const jsonlFileFilter = utils.stream.filter<fs.Dirent>(
      (entry) => entry.isFile() && entry.name.endsWith('.jsonl'),
      { objectMode: true }
    );

    const createReadStreamFromPathTransform = utils.stream.map<fs.Dirent, fs.ReadStream>(
      (entry) => {
        const filePath = path.join(fullPath, entry.name);
        return fs.createReadStream(filePath);
      }
    );

    const jsonLineParserChain = chain([
      parser({ checkErrors: true }),
      (line: { key: string; value: object }) => line.value,
    ]);

    return this.#streamDirectory(fullPath, [
      jsonlFileFilter,
      createReadStreamFromPathTransform,
      jsonLineParserChain,
    ]);
  }

  async #streamDirectory(directoryPath: string, transforms: StreamItem[] = []): Promise<Readable> {
    const outStream = new PassThrough({ objectMode: true });

    try {
      const dir = await fs.promises.opendir(directoryPath);
      const sourceStream = Readable.from(dir, { objectMode: true });

      return pipeline(sourceStream, chain(transforms), outStream, (e) => {
        if (e) {
          outStream.destroy(new ProviderTransferError(`Streaming error: ${e}`));
        }
      });
    } catch (e) {
      outStream.destroy(
        new ProviderTransferError(`Failed to read directory: ${directoryPath}. Error: ${e}`)
      );
    }

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
