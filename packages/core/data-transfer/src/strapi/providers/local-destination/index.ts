import { Writable } from 'stream';
import path from 'path';
import * as fse from 'fs-extra';
import type {
  IAsset,
  IDestinationProvider,
  IMetadata,
  ProviderType,
  Transaction,
} from '../../../../types';

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

  transaction?: Transaction;

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

    this.transaction = utils.transaction.createTransaction(this.strapi);
  }

  async close(): Promise<void> {
    const { autoDestroy } = this.options;
    this.transaction?.end();

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

  async rollback() {
    await this.transaction?.rollback();
  }

  async beforeTransfer() {
    if (!this.strapi) {
      throw new Error('Strapi instance not found');
    }

    await this.transaction?.attach(async () => {
      try {
        if (this.options.strategy === 'restore') {
          await this.#deleteAll();
        }
      } catch (error) {
        throw new Error(`restore failed ${error}`);
      }
    });
  }

  getMetadata(): IMetadata {
    const strapiVersion = strapi.config.get('info.strapi');
    const createdAt = new Date().toISOString();

    return {
      createdAt,
      strapi: {
        version: strapiVersion,
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
        transaction: this.transaction,
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

    try {
      await fse.move(assetsDirectory, backupDirectory);
      await fse.mkdir(assetsDirectory);
      // Create a .gitkeep file to ensure the directory is not empty
      await fse.outputFile(path.join(assetsDirectory, '.gitkeep'), '');
    } catch (err) {
      throw new ProviderTransferError(
        'The backup folder for the assets could not be created inside the public folder. Please ensure Strapi has write permissions on the public directory'
      );
    }

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
          .on('close', () => {
            callback(null);
          })
          .on('error', async (error: NodeJS.ErrnoException) => {
            const errorMessage =
              error.code === 'ENOSPC'
                ? " Your server doesn't have space to proceed with the import. "
                : ' ';

            try {
              await fse.rm(assetsDirectory, { recursive: true, force: true });
              await fse.move(backupDirectory, assetsDirectory);
              this.destroy(
                new ProviderTransferError(
                  `There was an error during the transfer process.${errorMessage}The original files have been restored to ${assetsDirectory}`
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
      return restore.createConfigurationWriteStream(this.strapi, this.transaction);
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
      return restore.createLinksWriteStream(mapID, this.strapi, this.transaction);
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
