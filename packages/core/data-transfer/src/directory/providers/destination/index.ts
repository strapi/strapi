import path from 'path';
import { createWriteStream } from 'fs';
import { Writable, pipeline } from 'stream';
import { finished } from 'stream/promises';
import fs from 'fs-extra';
import { stringer } from 'stream-json/jsonl/Stringer';
import { chain } from 'stream-chain';

import type {
  IAsset,
  IDestinationProvider,
  IDestinationProviderTransferResults,
  IMetadata,
  ProviderType,
} from '../../../types';
import type { IDiagnosticReporter } from '../../../utils/diagnostic';
import { createDirectoryJsonlWriter, createFilePathFactory } from './utils';
import { ProviderTransferError } from '../../../errors/providers';

export interface ILocalDirectoryDestinationProviderOptions {
  directory: {
    /** Output root: unpacked Strapi export layout (metadata.json, entities/, …) */
    path: string;
  };
  file: {
    maxSizeJsonl?: number;
  };
}

export interface ILocalDirectoryDestinationProviderTransferResults extends IDestinationProviderTransferResults {
  file?: {
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

  #rootResolved: string;

  #diagnostics?: IDiagnosticReporter;

  #rolledBack = false;

  #jsonlWriters: Writable[] = [];

  constructor(options: ILocalDirectoryDestinationProviderOptions) {
    this.options = options;
    this.#rootResolved = path.resolve(options.directory.path);
  }

  #reportInfo(message: string) {
    this.#diagnostics?.report({
      details: {
        createdAt: new Date(),
        message,
        origin: 'directory-destination-provider',
      },
      kind: 'info',
    });
  }

  setMetadata(target: ProviderType, metadata: IMetadata): IDestinationProvider {
    this.#providersMetadata[target] = metadata;
    return this;
  }

  async bootstrap(diagnostics: IDiagnosticReporter): Promise<void> {
    this.#diagnostics = diagnostics;
    this.#rolledBack = false;
    this.#jsonlWriters = [];
    this.#reportInfo('preparing directory export');
    await fs.mkdir(this.#rootResolved, { recursive: true });
    this.results.file = { path: this.#rootResolved };
  }

  async close() {
    if (this.#rolledBack) {
      return;
    }

    // The engine's stage pipeline can resolve before a writer's async `final` flush has hit
    // the disk; the process may exit right after close(), which would truncate the file
    // mid-write. Wait for every jsonl writer to fully finish (or be destroyed) first.
    await Promise.all(this.#jsonlWriters.map((writer) => finished(writer).catch(() => undefined)));

    await this.#writeMetadata();
  }

  async rollback(): Promise<void> {
    this.#rolledBack = true;
    this.#reportInfo('rolling back');
    await fs.rm(this.#rootResolved, { recursive: true, force: true });
  }

  getMetadata() {
    return null;
  }

  async #writeMetadata(): Promise<void> {
    this.#reportInfo('writing metadata');
    const metadata = this.#providersMetadata.source;
    if (metadata) {
      const target = path.join(this.#rootResolved, 'metadata.json');
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, JSON.stringify(metadata, null, 2), 'utf8');
    }
  }

  #createJsonlWriteStream(type: 'schemas' | 'entities' | 'links' | 'configuration'): Writable {
    this.#reportInfo(`creating ${type} write stream`);
    const filePathFactory = createFilePathFactory(type);
    const entryStream = createDirectoryJsonlWriter(
      this.#rootResolved,
      filePathFactory,
      this.options.file.maxSizeJsonl
    );

    // Tracked so close() can wait for the async final flush to reach the disk.
    this.#jsonlWriters.push(entryStream);

    return chain([stringer(), entryStream]);
  }

  createSchemasWriteStream() {
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
    this.#reportInfo('creating assets write stream');
    const root = this.#rootResolved;

    return new Writable({
      objectMode: true,
      write(data: IAsset, _encoding, callback) {
        const { filename } = data;
        const entryPath = path.join(root, 'assets', 'uploads', filename);
        const entryMetadataPath = path.join(root, 'assets', 'metadata', `${filename}.json`);

        const assetWriteError = (cause: unknown) =>
          new ProviderTransferError(`Failed to write asset ${filename}`, {
            details: {
              error: cause instanceof Error ? cause : new Error(String(cause)),
            },
          });

        let fileStream: ReturnType<typeof createWriteStream>;

        try {
          fs.mkdirSync(path.dirname(entryPath), { recursive: true });
          fs.mkdirSync(path.dirname(entryMetadataPath), { recursive: true });
          fs.writeFileSync(entryMetadataPath, JSON.stringify(data.metadata), 'utf8');
          fileStream = createWriteStream(entryPath);
        } catch (error: unknown) {
          callback(assetWriteError(error));
          return;
        }

        pipeline(data.stream, fileStream, (err) => {
          if (err) {
            callback(assetWriteError(err));
            return;
          }
          callback(null);
        });
      },
    });
  }
}
