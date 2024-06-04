import { Writable, Readable } from 'stream';
import path from 'path';
import * as fse from 'fs-extra';
import type { Knex } from 'knex';
import type { Core, Struct } from '@strapi/types';
import type {
  IAsset,
  IDestinationProvider,
  IFile,
  IMetadata,
  ProviderType,
  Transaction,
} from '../../../../types';

import { restore } from './strategies';
import * as utils from '../../../utils';
import {
  ProviderInitializationError,
  ProviderTransferError,
  ProviderValidationError,
} from '../../../errors/providers';
import { assertValidStrapi } from '../../../utils/providers';

export const VALID_CONFLICT_STRATEGIES = ['restore'];
export const DEFAULT_CONFLICT_STRATEGY = 'restore';

export interface ILocalStrapiDestinationProviderOptions {
  getStrapi(): Core.Strapi | Promise<Core.Strapi>; // return an initialized instance of Strapi

  autoDestroy?: boolean; // shut down the instance returned by getStrapi() at the end of the transfer
  restore?: restore.IRestoreOptions; // erase data in strapi database before transfer; required if strategy is 'restore'
  strategy: 'restore'; // conflict management strategy; only the restore strategy is available at this time
}

class LocalStrapiDestinationProvider implements IDestinationProvider {
  name = 'destination::local-strapi';

  type: ProviderType = 'destination';

  options: ILocalStrapiDestinationProviderOptions;

  strapi?: Core.Strapi;

  transaction?: Transaction;

  uploadsBackupDirectoryName: string;

  onWarning?: ((message: string) => void) | undefined;

  /**
   * The entities mapper is used to map old entities to their new IDs
   */
  #entitiesMapper: { [type: string]: { [id: number]: number } };

  constructor(options: ILocalStrapiDestinationProviderOptions) {
    this.options = options;
    this.#entitiesMapper = {};
    this.uploadsBackupDirectoryName = `uploads_backup_${Date.now()}`;
  }

  async bootstrap(): Promise<void> {
    this.#validateOptions();
    this.strapi = await this.options.getStrapi();
    if (!this.strapi) {
      throw new ProviderInitializationError('Could not access local strapi');
    }

    this.transaction = utils.transaction.createTransaction(this.strapi);
  }

  // TODO: either move this to restore strategy, or restore strategy should given access to these instead of repeating the logic possibly in a different way
  #areAssetsIncluded = () => {
    return this.options.restore?.assets;
  };

  #isContentTypeIncluded = (type: string) => {
    const notIncluded =
      this.options.restore?.entities?.include &&
      !this.options.restore?.entities?.include?.includes(type);
    const excluded =
      this.options.restore?.entities?.exclude &&
      this.options.restore?.entities.exclude.includes(type);

    return !excluded && !notIncluded;
  };

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

    // require restore options when using restore
    if (this.options.strategy === 'restore' && !this.options.restore) {
      throw new ProviderValidationError('Missing restore options');
    }
  }

  async #deleteFromRestoreOptions() {
    assertValidStrapi(this.strapi);
    if (!this.options.restore) {
      throw new ProviderValidationError('Missing restore options');
    }
    return restore.deleteRecords(this.strapi, this.options.restore);
  }

  async #deleteAllAssets(trx?: Knex.Transaction) {
    assertValidStrapi(this.strapi);

    // if we're not restoring files, don't touch the files
    if (!this.#areAssetsIncluded()) {
      return;
    }

    const stream: Readable = this.strapi.db
      // Create a query builder instance (default type is 'select')
      .queryBuilder('plugin::upload.file')
      // Fetch all columns
      .select('*')
      // Attach the transaction
      .transacting(trx)
      // Get a readable stream
      .stream();

    // TODO use bulk delete when exists in providers
    for await (const file of stream) {
      await this.strapi.plugin('upload').provider.delete(file);
      if (file.formats) {
        for (const fileFormat of Object.values(file.formats)) {
          await this.strapi.plugin('upload').provider.delete(fileFormat);
        }
      }
    }
  }

  async rollback() {
    await this.transaction?.rollback();
  }

  async beforeTransfer() {
    if (!this.strapi) {
      throw new Error('Strapi instance not found');
    }

    await this.transaction?.attach(async (trx) => {
      try {
        if (this.options.strategy === 'restore') {
          await this.#handleAssetsBackup();
          await this.#deleteAllAssets(trx);
          await this.#deleteFromRestoreOptions();
        }
      } catch (error) {
        throw new Error(`restore failed ${error}`);
      }
    });
  }

  getMetadata(): IMetadata {
    assertValidStrapi(this.strapi, 'Not able to get Schemas');
    const strapiVersion = this.strapi.config.get<string>('info.strapi');
    const createdAt = new Date().toISOString();

    return {
      createdAt,
      strapi: {
        version: strapiVersion,
      },
    };
  }

  getSchemas(): Record<string, Struct.Schema> {
    assertValidStrapi(this.strapi, 'Not able to get Schemas');

    const schemas = utils.schema.schemasToValidJSON({
      ...this.strapi.contentTypes,
      ...this.strapi.components,
    });

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

  async #handleAssetsBackup() {
    assertValidStrapi(this.strapi, 'Not able to create the assets backup');

    // if we're not restoring assets, don't back them up because they won't be touched
    if (!this.#areAssetsIncluded()) {
      return;
    }

    if (this.strapi.config.get<{ provider: string }>('plugin::upload').provider === 'local') {
      const assetsDirectory = path.join(this.strapi.dirs.static.public, 'uploads');
      const backupDirectory = path.join(
        this.strapi.dirs.static.public,
        this.uploadsBackupDirectoryName
      );

      try {
        // Check access before attempting to do anything
        await fse.access(
          assetsDirectory,
          // eslint-disable-next-line no-bitwise
          fse.constants.W_OK | fse.constants.R_OK | fse.constants.F_OK
        );
        // eslint-disable-next-line no-bitwise
        await fse.access(path.join(assetsDirectory, '..'), fse.constants.W_OK | fse.constants.R_OK);

        await fse.move(assetsDirectory, backupDirectory);
        await fse.mkdir(assetsDirectory);
        // Create a .gitkeep file to ensure the directory is not empty
        await fse.outputFile(path.join(assetsDirectory, '.gitkeep'), '');
      } catch (err) {
        throw new ProviderTransferError(
          'The backup folder for the assets could not be created inside the public folder. Please ensure Strapi has write permissions on the public directory',
          {
            code: 'ASSETS_DIRECTORY_ERR',
          }
        );
      }
      return backupDirectory;
    }
  }

  async #removeAssetsBackup() {
    assertValidStrapi(this.strapi, 'Not able to remove Assets');
    // if we're not restoring assets, don't back them up because they won't be touched
    if (!this.#areAssetsIncluded()) {
      return;
    }

    // TODO: this should catch all thrown errors and bubble it up to engine so it can be reported as a non-fatal diagnostic message telling the user they may need to manually delete assets
    if (this.strapi.config.get<{ provider: string }>('plugin::upload').provider === 'local') {
      assertValidStrapi(this.strapi);
      const backupDirectory = path.join(
        this.strapi.dirs.static.public,
        this.uploadsBackupDirectoryName
      );
      await fse.rm(backupDirectory, { recursive: true, force: true });
    }
  }

  // TODO: Move this logic to the restore strategy
  async createAssetsWriteStream(): Promise<Writable> {
    assertValidStrapi(this.strapi, 'Not able to stream Assets');

    if (!this.#areAssetsIncluded()) {
      throw new ProviderTransferError(
        'Attempting to transfer assets when `assets` is not set in restore options'
      );
    }

    const removeAssetsBackup = this.#removeAssetsBackup.bind(this);
    const strapi = this.strapi;
    const transaction = this.transaction;
    const backupDirectory = this.uploadsBackupDirectoryName;
    const fileEntitiesMapper = this.#entitiesMapper['plugin::upload.file'];

    const restoreMediaEntitiesContent = this.#isContentTypeIncluded('plugin::upload.file');

    return new Writable({
      objectMode: true,
      async final(next) {
        // Delete the backup folder
        await removeAssetsBackup();
        next();
      },
      async write(chunk: IAsset, _encoding, callback) {
        await transaction?.attach(async () => {
          // TODO: Remove this logic in V5
          if (!chunk.metadata) {
            // If metadata does not exist is because it is an old backup file
            const assetsDirectory = path.join(strapi.dirs.static.public, 'uploads');
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
            return;
          }

          const uploadData = {
            ...chunk.metadata,
            stream: Readable.from(chunk.stream),
            buffer: chunk?.buffer,
          };

          const provider = strapi.config.get<{ provider: string }>('plugin::upload').provider;

          try {
            await strapi.plugin('upload').provider.uploadStream(uploadData);

            // if we're not supposed to transfer the associated entities, stop here
            if (!restoreMediaEntitiesContent) {
              return callback();
            }

            // Files formats are stored within the parent file entity
            if (uploadData?.type) {
              // Support usage of main hash for older versions
              const condition = uploadData?.id
                ? { id: fileEntitiesMapper[uploadData.id] }
                : { hash: uploadData.mainHash };
              const entry: IFile = await strapi.db.query('plugin::upload.file').findOne({
                where: condition,
              });
              const specificFormat = entry?.formats?.[uploadData.type];
              if (specificFormat) {
                specificFormat.url = uploadData.url;
              }
              await strapi.db.query('plugin::upload.file').update({
                where: { id: entry.id },
                data: {
                  formats: entry.formats,
                  provider,
                },
              });
              return callback();
            }
            const entry: IFile = await strapi.db.query('plugin::upload.file').findOne({
              where: { id: fileEntitiesMapper[uploadData.id] },
            });
            entry.url = uploadData.url;
            await strapi.db.query('plugin::upload.file').update({
              where: { id: entry.id },
              data: {
                url: entry.url,
                provider,
              },
            });
            callback();
          } catch (error) {
            callback(new Error(`Error while uploading asset ${chunk.filename} ${error}`));
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
      return restore.createLinksWriteStream(mapID, this.strapi, this.transaction, this.onWarning);
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
