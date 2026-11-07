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

  // The chain emits `finish` before the inner writer's final flush lands on disk. Each entry
  // settles to the error that stopped the writer, or null.
  #pendingWrites: Promise<unknown>[] = [];

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
    this.#pendingWrites = [];
    this.#reportInfo('preparing directory export');
    await fs.mkdir(this.#rootResolved, { recursive: true });
    this.results.file = { path: this.#rootResolved };
  }

  async close() {
    if (this.#rolledBack) {
      return;
    }

    // By now the stage pipelines have resolved, so a late flush failure only surfaces here
    const failures = await Promise.all(this.#pendingWrites);
    const failure = failures.find((error) => error != null);
    if (failure) {
      throw new ProviderTransferError('Failed to write export files', {
        details: { error: failure instanceof Error ? failure : new Error(String(failure)) },
      });
    }

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

  #createJsonlWriteStream(type: string) {
    const entryStream = createDirectoryJsonlWriter(
      this.#rootResolved,
      createFilePathFactory(type),
      this.options.file.maxSizeJsonl
    );
    this.#pendingWrites.push(
      finished(entryStream).then(
        () => null,
        // A writer destroyed before any data (a stage with no source) is not a failure
        (error) => (error?.code === 'ERR_STREAM_PREMATURE_CLOSE' ? null : error)
      )
    );

    const writer = chain([stringer(), entryStream]);
    // The engine destroys only this outer stream for a stage it skips, and `Chain` does not pass
    // that on: without this the inner writer never closes and `close()` waits forever.
    writer.once('close', () => {
      if (!writer.writableFinished) {
        entryStream.destroy();
      }
    });
    // A late flush failure is re-emitted here after the stage has stopped listening; `close()`
    // reports it instead.
    writer.on('error', () => {});
    return writer;
  }

  createSchemasWriteStream() {
    this.#reportInfo('creating schemas write stream');
    return this.#createJsonlWriteStream('schemas');
  }

  createEntitiesWriteStream(): Writable {
    this.#reportInfo('creating entities write stream');
    return this.#createJsonlWriteStream('entities');
  }

  createLinksWriteStream(): Writable {
    this.#reportInfo('creating links write stream');
    return this.#createJsonlWriteStream('links');
  }

  createConfigurationWriteStream(): Writable {
    this.#reportInfo('creating configuration write stream');
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
