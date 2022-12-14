import { Writable } from 'stream';
import path from 'path';
import * as fse from 'fs-extra';
import type { IAsset, IDestinationProvider, IMetadata, ProviderType } from '../../../types';

import { restore } from './strategies';
import * as utils from '../../utils';

export const VALID_STRATEGIES = ['restore', 'merge'];

interface ILocalStrapiDestinationProviderOptions {
  getStrapi(): Strapi.Strapi | Promise<Strapi.Strapi>;
  restore?: restore.IRestoreOptions;
  strategy: 'restore' | 'merge';
}

class LocalStrapiDestinationProvider implements IDestinationProvider {
  name = 'destination::local-strapi';

  type: ProviderType = 'destination';

  options: ILocalStrapiDestinationProviderOptions;

  strapi?: Strapi.Strapi;

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
    await this.strapi?.destroy?.();
  }

  #validateOptions() {
    if (!VALID_STRATEGIES.includes(this.options.strategy)) {
      throw new Error(`Invalid stategy ${this.options.strategy}`);
    }
  }

  async #deleteAll() {
    if (!this.strapi) {
      throw new Error('Strapi instance not found');
    }

    return restore.deleteRecords(this.strapi, this.options.restore);
  }

  async beforeTransfer() {
    if (this.options.strategy === 'restore') {
      await this.#deleteAll();
    }
  }

  getMetadata(): IMetadata | Promise<IMetadata> {
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
    if (!this.strapi) {
      throw new Error('Not able to get Schemas. Strapi instance not found');
    }

    const schemas = {
      ...this.strapi.contentTypes,
      ...this.strapi.components,
    };

    return utils.schema.mapSchemasValues(schemas);
  }

  getEntitiesStream(): Writable {
    if (!this.strapi) {
      throw new Error('Not able to import entities. Strapi instance not found');
    }

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

    throw new Error(`Invalid strategy supplied: "${strategy}"`);
  }

  async getAssetsStream(): Promise<Writable> {
    if (!this.strapi) {
      throw new Error('Not able to stream Assets. Strapi instance not found');
    }

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
                new Error(
                  `There was an error during the transfer process. The original files have been restored to ${assetsDirectory}`
                )
              );
            } catch (err) {
              throw new Error(
                `There was an error doing the rollback process. The original files are in ${backupDirectory}, but we failed to restore them to ${assetsDirectory}`
              );
            } finally {
              callback(error);
            }
          });
      },
    });
  }

  async getConfigurationStream(): Promise<Writable> {
    if (!this.strapi) {
      throw new Error('Not able to stream Configurations. Strapi instance not found');
    }

    const { strategy } = this.options;

    if (strategy === 'restore') {
      return restore.createConfigurationWriteStream(this.strapi);
    }

    throw new Error(`Invalid strategy supplied: "${strategy}"`);
  }
}

export const createLocalStrapiDestinationProvider = (
  options: ILocalStrapiDestinationProviderOptions
) => {
  return new LocalStrapiDestinationProvider(options);
};
