import fs from 'fs-extra';
import path from 'path';
import { Schema } from '@strapi/types';
import { chain } from 'stream-chain';
import { pipeline, Writable } from 'stream';
import { stringer } from 'stream-json/jsonl/Stringer';

import type {
  IAsset,
  IDestinationProvider,
  ProviderType,
  IMetadata,
  IEntity,
  ILink,
  IConfiguration,
} from '../../../../types';

/**
 * Create a path factory for a given path and prefix.
 * Upon being called, the factory returns a path for a given index
 */
export const createFilePathFactory =
  <T>(type: string, callback: (value: T) => string) =>
  (data: T): string => {
    if (data === null) {
      return path.join(type);
    }

    return path.join(
      // "{type}" directory
      type,
      // "${type}_XXXXX.jsonl" file
      `${type}_${callback(data)}.jsonl`
    );
  };

export interface ILocalDirectoryDestinationProviderOptions {
  directory: {
    path: string; // the directory to write files to
  };
}

export const createLocalDirectoryDestinationProvider = (
  options: ILocalDirectoryDestinationProviderOptions
) => {
  return new LocalDirectoryDestinationProvider(options);
};

class LocalDirectoryDestinationProvider implements IDestinationProvider {
  type: ProviderType = 'destination';

  name = 'destination::local-directory';

  options: ILocalDirectoryDestinationProviderOptions;

  #providersMetadata: { source?: IMetadata; destination?: IMetadata } = {};

  constructor(options: ILocalDirectoryDestinationProviderOptions) {
    this.options = options;
  }

  #prefixPath(name: string): string {
    const { path: directoryPath } = this.options.directory;

    return path.join(directoryPath, name);
  }

  setMetadata(target: ProviderType, metadata: IMetadata): IDestinationProvider {
    this.#providersMetadata[target] = metadata;

    return this;
  }

  async bootstrap(): Promise<void> {
    const { path: directoryPath } = this.options.directory;

    // Ensure the directory exists, if it does, empty-it
    await fs.emptyDir(directoryPath);

    // Optionally, ensure sub-directories exist
    await fs.emptyDir(this.#prefixPath('schemas'));
    await fs.emptyDir(this.#prefixPath('entities'));
    await fs.emptyDir(this.#prefixPath('links'));
    await fs.emptyDir(this.#prefixPath('configuration'));
    await fs.emptyDir(this.#prefixPath('assets/uploads'));
    await fs.emptyDir(this.#prefixPath('assets/metadata'));
  }

  async close(): Promise<void> {
    await this.writeMetadata();
  }

  async rollback(): Promise<void> {
    const { path: directoryPath } = this.options.directory;

    await fs.remove(directoryPath);
  }

  getMetadata() {
    return null;
  }

  async writeMetadata(): Promise<void> {
    const metadataPath = this.#prefixPath('metadata.json');
    const metadata = this.#providersMetadata.source;

    if (metadata !== null) {
      await fs.writeJSON(metadataPath, metadata, { spaces: 2 });
    }
  }

  createSchemasWriteStream(): Promise<Writable> {
    const { path: directoryPath } = this.options.directory;
    const filePathFactory = createFilePathFactory<Schema.Schema>('schemas', (schema) => {
      return schema.uid.replaceAll('::', '__').replaceAll('.', '_');
    });

    return this.createJsonlWriteStream(directoryPath, filePathFactory);
  }

  createEntitiesWriteStream(): Promise<Writable> {
    const { path: directoryPath } = this.options.directory;
    const filePathFactory = createFilePathFactory<IEntity>('entities', (entity) => {
      return entity.type.replaceAll('::', '__').replaceAll('.', '_');
    });

    return this.createJsonlWriteStream(directoryPath, filePathFactory);
  }

  createLinksWriteStream(): Promise<Writable> {
    const { path: directoryPath } = this.options.directory;
    const filePathFactory = createFilePathFactory<ILink>('links', (link) => {
      return link.kind.replaceAll('.', '-');
    });

    return this.createJsonlWriteStream(directoryPath, filePathFactory);
  }

  createConfigurationWriteStream(): Promise<Writable> {
    const { path: directoryPath } = this.options.directory;
    const filePathFactory = createFilePathFactory<IConfiguration>(
      'configuration',
      (config) => config.type
    );

    return this.createJsonlWriteStream(directoryPath, filePathFactory);
  }

  private async createJsonlWriteStream(
    directoryPath: string,
    filePathFactory: (data: any) => string
  ): Promise<Writable> {
    const fullDirPath = path.join(directoryPath, path.dirname(filePathFactory(null)));

    // Ensure the directory exists
    await fs.ensureDir(fullDirPath);

    return chain([
      stringer(),
      new Writable({
        objectMode: true,
        write: (chunk, _, callback) => {
          // TODO: Find a more efficient/elegant way of computing the path, without having to parse the chunk
          const filePath = this.#prefixPath(filePathFactory(JSON.parse(chunk.toString())));
          fs.appendFile(filePath, chunk, callback);
        },
      }),
    ]);
  }

  createAssetsWriteStream(): Writable {
    const { path: directoryPath } = this.options.directory;

    const uploadsDir = path.join(directoryPath, 'assets/uploads');
    const metadataDir = path.join(directoryPath, 'assets/metadata');

    return new Writable({
      objectMode: true,
      async write(data: IAsset, _, callback) {
        const filePath = path.join(uploadsDir, data.filename);
        const metadataPath = path.join(metadataDir, `${data.filename}.json`);

        try {
          // Write an asset file
          const writeStream = fs.createWriteStream(filePath);

          pipeline(data.stream, writeStream, (err) => {
            if (err) {
              this.destroy(err);
            }
          });

          // Write a metadata file
          await fs.writeJSON(metadataPath, data.metadata, { spaces: 2 });

          callback();
        } catch (error) {
          if (error instanceof Error) {
            callback(error);
          } else if (typeof error === 'string') {
            callback(new Error(error));
          }
        }
      },
    });
  }
}

export default LocalDirectoryDestinationProvider;
