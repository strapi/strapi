import { Writable } from 'stream';
import path from 'path';
import * as fse from 'fs-extra';
import type { IAsset, IDestinationProvider, IMetadata, ProviderType } from '../../../../types';

import { restore } from './strategies';
import * as utils from '../../../utils';
import { ProviderTransferError, ProviderValidationError } from '../../../errors/providers';
import { assertValidStrapi } from '../../../utils/providers';

export const VALID_CONFLICT_STRATEGIES = ['restore', 'merge'];
export const DEFAULT_CONFLICT_STRATEGY = 'restore';

export interface ILocalStrapiDestinationProviderOptions {
  getStrapi(): Strapi.Strapi | Promise<Strapi.Strapi>;
  autoDestroy?: boolean;
  restore?: restore.IRestoreOptions;
  strategy: 'restore' | 'merge';
}

class LocalStrapiDestinationProvider implements IDestinationProvider {
  name = 'destination::local-strapi';

  type: ProviderType = 'destination';

  options: ILocalStrapiDestinationProviderOptions;

  strapi?: Strapi.Strapi;

  /**
   * The entities mapper is used to map old entities to their new IDs
   */
  #entitiesMapper: { [type: string]: { [id: number]: number } };

  constructor(options: ILocalStrapiDestinationProviderOptions) {
    this.options = options;
    this.#entitiesMapper = {};
  }

  async bootstrap(): Promise<void> {
    this.#validateOptions();
    this.strapi = await this.options.getStrapi();
  }

  async close(): Promise<void> {
    const { autoDestroy } = this.options;

    // Basically `!== false` but more deterministic
    if (autoDestroy === undefined || autoDestroy === true) {
      await this.strapi?.destroy();
    }
  }

  #validateOptions() {
    if (!VALID_CONFLICT_STRATEGIES.includes(this.options.strategy)) {
      throw new ProviderValidationError(`Invalid strategy ${this.options.strategy}`, {
        check: 'strategy',
        strategy: this.options.strategy,
        validStrategies: VALID_CONFLICT_STRATEGIES,
      });
    }
  }

  async #deleteAll() {
    assertValidStrapi(this.strapi);
    return restore.deleteRecords(this.strapi, this.options.restore);
  }

  async beforeTransfer() {
    if (this.options.strategy === 'restore') {
      await this.#deleteAll();
    }
  }

  getMetadata(): IMetadata {
    const strapiVersion = strapi.config.get('info.strapi');
    const createdAt = new Date().toISOString();

    const plugins = Object.keys(strapi.plugins);

    return {
      createdAt,
      strapi: {
        version: strapiVersion,
        plugins: plugins.map((name) => ({
          name,
          // TODO: Get the plugin actual version when it'll be available
          version: strapiVersion,
        })),
      },
    };
  }

  getSchemas() {
    assertValidStrapi(this.strapi, 'Not able to get Schemas');
    const schemas = {
      ...this.strapi.contentTypes,
      ...this.strapi.components,
    };

    return utils.schema.mapSchemasValues(schemas);
  }

  createEntitiesWriteStream(): Writable {
    assertValidStrapi(this.strapi, 'Not able to import entities');
    const { strategy } = this.options;

    const updateMappingTable = (type: string, oldID: number, newID: number) => {
      if (!this.#entitiesMapper[type]) {
        this.#entitiesMapper[type] = {};
      }

      Object.assign(this.#entitiesMapper[type], { [oldID]: newID });
    };

    if (strategy === 'restore') {
      return restore.createEntitiesWriteStream({
        strapi: this.strapi,
        updateMappingTable,
      });
    }

    throw new ProviderValidationError(`Invalid strategy ${this.options.strategy}`, {
      check: 'strategy',
      strategy: this.options.strategy,
      validStrategies: VALID_CONFLICT_STRATEGIES,
    });
  }

  // TODO: Move this logic to the restore strategy
  async createAssetsWriteStream(): Promise<Writable> {
    assertValidStrapi(this.strapi, 'Not able to stream Assets');

    const assetsDirectory = path.join(this.strapi.dirs.static.public, 'uploads');
    const backupDirectory = path.join(
      this.strapi.dirs.static.public,
      `uploads_backup_${Date.now()}`
    );

    await fse.rename(assetsDirectory, backupDirectory);
    await fse.mkdir(assetsDirectory);

    return new Writable({
      objectMode: true,
      async final(next) {
        await fse.rm(backupDirectory, { recursive: true, force: true });
        next();
      },
      async write(chunk: IAsset, _encoding, callback) {
        const entryPath = path.join(assetsDirectory, chunk.filename);
        const writableStream = fse.createWriteStream(entryPath);

        chunk.stream
          .pipe(writableStream)
          .on('close', callback)
          .on('error', async (error: Error) => {
            try {
              await fse.rm(assetsDirectory, { recursive: true, force: true });
              await fse.rename(backupDirectory, assetsDirectory);
              this.destroy(
                new ProviderTransferError(
                  `There was an error during the transfer process. The original files have been restored to ${assetsDirectory}`
                )
              );
            } catch (err) {
              throw new ProviderTransferError(
                `There was an error doing the rollback process. The original files are in ${backupDirectory}, but we failed to restore them to ${assetsDirectory}`
              );
            } finally {
              callback(error);
            }
          });
      },
    });
  }

  async createConfigurationWriteStream(): Promise<Writable> {
    assertValidStrapi(this.strapi, 'Not able to stream Configurations');

    const { strategy } = this.options;

    if (strategy === 'restore') {
      return restore.createConfigurationWriteStream(this.strapi);
    }

    throw new ProviderValidationError(`Invalid strategy ${strategy}`, {
      check: 'strategy',
      strategy,
      validStrategies: VALID_CONFLICT_STRATEGIES,
    });
  }

  async createLinksWriteStream(): Promise<Writable> {
    if (!this.strapi) {
      throw new Error('Not able to stream links. Strapi instance not found');
    }

    const { strategy } = this.options;
    const mapID = (uid: string, id: number): number | undefined => this.#entitiesMapper[uid]?.[id];

    if (strategy === 'restore') {
      return restore.createLinksWriteStream(mapID, this.strapi);
    }

    throw new ProviderValidationError(`Invalid strategy ${strategy}`, {
      check: 'strategy',
      strategy,
      validStrategies: VALID_CONFLICT_STRATEGIES,
    });
  }
}

export const createLocalStrapiDestinationProvider = (
  options: ILocalStrapiDestinationProviderOptions
) => {
  return new LocalStrapiDestinationProvider(options);
};
