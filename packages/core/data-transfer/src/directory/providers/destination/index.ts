import path from 'path';
import { Writable } from 'stream';
import fs from 'fs-extra';
import type {
  IAsset,
  IDestinationProvider,
  IDestinationProviderTransferResults,
  IMetadata,
  ProviderType,
} from '../../../../types';

export interface ILocalDirectoryDestinationProviderOptions {
  directory: {
    path: string; // the directory to output files to
  };
}

export interface ILocalDirectoryDestinationProviderTransferResults
  extends IDestinationProviderTransferResults {
  directory?: {
    path?: string;
  };
}

export const createLocalDirectoryDestinationProvider = (
  options: ILocalDirectoryDestinationProviderOptions
) => {
  return new LocalDirectoryDestinationProvider(options);
};

class LocalDirectoryDestinationProvider implements IDestinationProvider {
  name = 'destination::local-directory';

  type: ProviderType = 'destination';

  options: ILocalDirectoryDestinationProviderOptions;

  results: ILocalDirectoryDestinationProviderTransferResults = {};

  #providersMetadata: { source?: IMetadata; destination?: IMetadata } = {};

  constructor(options: ILocalDirectoryDestinationProviderOptions) {
    this.options = options;
  }

  async bootstrap(): Promise<void> {
    const { path: directoryPath } = this.options.directory;

    try {
      // Ensure the base directory exists
      await fs.ensureDir(directoryPath);
      this.results.directory = { path: directoryPath };
    } catch (e) {
      throw new Error(`Could not initialize destination provider: ${(e as Error).message}`);
    }
  }

  async close(): Promise<void> {
    // Write metadata if available
    if (this.#providersMetadata.source) {
      const metadataPath = path.join(this.options.directory.path, 'metadata.json');
      await fs.writeJSON(metadataPath, this.#providersMetadata.source, { spaces: 2 });
    }
  }

  async rollback(): Promise<void> {
    // Remove the directory and its contents
    await fs.remove(this.options.directory.path);
  }

  setMetadata(target: ProviderType, metadata: IMetadata): IDestinationProvider {
    this.#providersMetadata[target] = metadata;
    return this;
  }

  getMetadata() {
    return null;
  }

  createSchemasWriteStream(): Writable {
    return this.#createJsonlWriteStream('schemas');
  }

  createEntitiesWriteStream(): Writable {
    return this.#createJsonlWriteStream('entities');
  }

  createLinksWriteStream(): Writable {
    return this.#createJsonlWriteStream('links');
  }

  createConfigurationWriteStream(): Writable {
    return this.#createJsonlWriteStream('configuration');
  }

  createAssetsWriteStream(): Writable {
    const assetsDir = path.join(this.options.directory.path, 'assets', 'uploads');
    const metadataDir = path.join(this.options.directory.path, 'assets', 'metadata');

    // Ensure directories exist
    fs.ensureDirSync(assetsDir);
    fs.ensureDirSync(metadataDir);

    return new Writable({
      objectMode: true,
      async write(data: IAsset, _encoding, callback) {
        try {
          // Write the asset file
          const assetFilePath = path.join(assetsDir, data.filename);
          const assetStream = data.stream.pipe(fs.createWriteStream(assetFilePath));

          // Wait for the asset file to finish writing
          await new Promise((resolve, reject) => {
            assetStream.on('finish', resolve).on('error', reject);
          });

          // Write the metadata file
          const metadataFilePath = path.join(metadataDir, `${data.filename}.json`);
          await fs.writeJSON(metadataFilePath, data.metadata, { spaces: 2 });

          callback(null);
        } catch (err) {
          callback(err instanceof Error ? err : new Error(String(err)));
        }
      },
    });
  }

  #createJsonlWriteStream(subDirectory: string): Writable {
    const directoryPath = path.join(this.options.directory.path, subDirectory);

    // Ensure the directory exists
    fs.ensureDirSync(directoryPath);

    let fileCounter = 0;

    const getFilePath = () => {
      fileCounter += 1;
      return path.join(directoryPath, `file${fileCounter}.jsonl`);
    };

    const currentStream = fs.createWriteStream(getFilePath());

    return new Writable({
      objectMode: true,
      write(chunk, _encoding, callback) {
        const stringified = `${JSON.stringify(chunk)}\n`;

        if (!currentStream.write(stringified)) {
          currentStream.once('drain', callback);
        } else {
          callback();
        }
      },
      final(callback) {
        currentStream.end(() => callback());
      },
    });
  }
}
