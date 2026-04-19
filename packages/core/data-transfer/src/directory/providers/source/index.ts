import path from 'path';
import type { Readable } from 'stream';
import { PassThrough } from 'stream';

import fs from 'fs-extra';
import { isEmpty, keyBy } from 'lodash/fp';
import { chain } from 'stream-chain';
import { parser } from 'stream-json/jsonl/Parser';
import type { Struct } from '@strapi/types';

import type { IAsset, IMetadata, ISourceProvider, ProviderType } from '../../../../types';
import type { IDiagnosticReporter } from '../../../utils/diagnostic';

import * as utils from '../../../utils';
import { ProviderInitializationError, ProviderTransferError } from '../../../errors/providers';
import { unknownPathToPosix } from '../../../file/providers/source/utils';

const METADATA_FILE_PATH = 'metadata.json';

export interface ILocalDirectorySourceProviderOptions {
  directory: {
    /** Absolute or relative path to the root of an unpacked Strapi data-transfer export */
    path: string;
  };
}

export const createLocalDirectorySourceProvider = (
  options: ILocalDirectorySourceProviderOptions
) => {
  return new LocalDirectorySourceProvider(options);
};

const isPathInsideRoot = (root: string, candidate: string): boolean => {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};

class LocalDirectorySourceProvider implements ISourceProvider {
  type: ProviderType = 'source';

  name = 'source::local-directory';

  options: ILocalDirectorySourceProviderOptions;

  #rootResolved: string;

  #metadata?: IMetadata;

  #diagnostics?: IDiagnosticReporter;

  constructor(options: ILocalDirectorySourceProviderOptions) {
    this.options = options;
    this.#rootResolved = path.resolve(options.directory.path);
  }

  #reportInfo(message: string) {
    this.#diagnostics?.report({
      details: {
        createdAt: new Date(),
        message,
        origin: 'directory-source-provider',
      },
      kind: 'info',
    });
  }

  /** Resolve a posix-style relative path under the export root; rejects escapes. */
  #safePath(...posixSegments: string[]): string {
    const joined = path.posix.join(...posixSegments);
    const segments = joined.split(path.posix.sep).filter(Boolean);
    const resolved = path.resolve(this.#rootResolved, ...segments);
    if (!isPathInsideRoot(this.#rootResolved, resolved)) {
      throw new ProviderInitializationError(`Invalid path "${joined}" — escapes backup directory`);
    }
    return resolved;
  }

  async bootstrap(diagnostics: IDiagnosticReporter) {
    this.#diagnostics = diagnostics;
    const root = this.#rootResolved;

    try {
      const stat = await fs.stat(root);
      if (!stat.isDirectory()) {
        throw new ProviderInitializationError(`Path '${root}' is not a directory.`);
      }
      await this.#loadMetadata();
    } catch (e) {
      if (e instanceof ProviderInitializationError) {
        throw e;
      }
      throw new ProviderInitializationError(
        `Directory '${root}' is not a valid Strapi data export.`
      );
    }

    if (!this.#metadata) {
      throw new ProviderInitializationError('Could not load metadata from Strapi data export.');
    }
  }

  async #loadMetadata() {
    const metadataPath = this.#safePath(METADATA_FILE_PATH);
    if (!(await fs.pathExists(metadataPath))) {
      throw new ProviderInitializationError(
        `Missing ${METADATA_FILE_PATH} in export directory '${this.#rootResolved}'.`
      );
    }
    this.#metadata = await fs.readJson(metadataPath);
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
      throw new ProviderInitializationError('Could not load schemas from Strapi data export.');
    }

    const schemas = keyBy('uid', schemaCollection);
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
    return this.#streamJsonlDirectory('configuration');
  }

  createAssetsReadStream(): Readable {
    const outStream = new PassThrough({ objectMode: true });
    const uploadsDir = this.#safePath('assets', 'uploads');
    this.#reportInfo('creating assets read stream');

    this.#pipeAssetsToStream(outStream, uploadsDir).catch((e: unknown) => {
      outStream.destroy(
        e instanceof Error ? e : new ProviderTransferError(String(e), { details: { error: e } })
      );
    });

    return outStream;
  }

  async #pipeAssetsToStream(outStream: PassThrough, uploadsDir: string): Promise<void> {
    if (!(await fs.pathExists(uploadsDir))) {
      outStream.end();
      return;
    }

    const names = (await fs.readdir(uploadsDir)).sort();
    for (const name of names) {
      const absUpload = path.join(uploadsDir, name);
      const stat = await fs.stat(absUpload);
      if (stat.isFile()) {
        let metadata: IAsset['metadata'];
        try {
          metadata = await this.#readAssetMetadata(name);
        } catch (error) {
          outStream.destroy(
            new ProviderTransferError(`Failed to read metadata for ${name}`, {
              details: { error },
            })
          );
          return;
        }

        const normalizedPath = unknownPathToPosix(path.posix.join('assets', 'uploads', name));
        const asset: IAsset = {
          metadata,
          filename: name,
          filepath: normalizedPath,
          stats: { size: stat.size },
          stream: fs.createReadStream(absUpload),
        };
        outStream.write(asset);
      }
    }
    outStream.end();
  }

  async #readAssetMetadata(filename: string): Promise<IAsset['metadata']> {
    const metadataPath = this.#safePath('assets', 'metadata', `${filename}.json`);
    return fs.readJson(metadataPath);
  }

  async #listJsonlFiles(posixSubdir: string): Promise<string[]> {
    const dirAbs = this.#safePath(...posixSubdir.split('/').filter(Boolean));
    if (!(await fs.pathExists(dirAbs))) {
      return [];
    }
    const names = await fs.readdir(dirAbs);
    return names
      .filter((n) => n.endsWith('.jsonl'))
      .sort()
      .map((n) => path.join(dirAbs, n));
  }

  #streamJsonlDirectory(posixSubdir: string): Readable {
    const outStream = new PassThrough({ objectMode: true });
    this.#reportInfo(`streaming jsonl from ${posixSubdir}`);

    this.#pipeJsonlDirectoryToStream(outStream, posixSubdir).catch((e: unknown) => {
      outStream.destroy(
        e instanceof Error ? e : new ProviderTransferError(String(e), { details: { error: e } })
      );
    });

    return outStream;
  }

  async #pipeJsonlDirectoryToStream(outStream: PassThrough, posixSubdir: string): Promise<void> {
    const files = await this.#listJsonlFiles(posixSubdir);
    for (const absPath of files) {
      const transforms = [
        parser({
          checkErrors: true,
        }),
        (line: { key: string; value: object }) => line.value,
      ];

      const stream = fs.createReadStream(absPath).pipe(chain(transforms));

      try {
        for await (const chunk of stream) {
          outStream.write(chunk);
        }
      } catch (e: unknown) {
        outStream.destroy(
          new ProviderTransferError(`Error parsing JSONL in ${absPath}: ${(e as Error).message}`, {
            details: {
              error: e,
            },
          })
        );
        return;
      }
    }
    outStream.end();
  }
}
