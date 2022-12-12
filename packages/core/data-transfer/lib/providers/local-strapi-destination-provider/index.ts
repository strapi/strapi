// import { createLogger } from '@strapi/logger';

import chalk from 'chalk';
import { Writable } from 'stream';
import path from 'path';
import * as fse from 'fs-extra';
import type { IConfiguration, IDestinationProvider, IMetadata, ProviderType } from '../../../types';

import { deleteAllRecords, DeleteOptions, restoreConfigs } from './restore';
import { mapSchemasValues } from '../../utils';

export const VALID_STRATEGIES = ['restore', 'merge'];

interface ILocalStrapiDestinationProviderOptions {
  getStrapi(): Strapi.Strapi | Promise<Strapi.Strapi>;
  restore?: DeleteOptions;
  strategy: 'restore' | 'merge';
}

export const createLocalStrapiDestinationProvider = (
  options: ILocalStrapiDestinationProviderOptions
) => {
  return new LocalStrapiDestinationProvider(options);
};

class LocalStrapiDestinationProvider implements IDestinationProvider {
  name = 'destination::local-strapi';

  type: ProviderType = 'destination';

  options: ILocalStrapiDestinationProviderOptions;

  strapi?: Strapi.Strapi;

  constructor(options: ILocalStrapiDestinationProviderOptions) {
    this.options = options;
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
    return deleteAllRecords(this.strapi, this.options.restore);
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

    return mapSchemasValues(schemas);
  }

  getAssetsStream(): NodeJS.WritableStream {
    if (!this.strapi) {
      throw new Error('Not able to stream Assets. Strapi instance not found');
    }

    const assetsDirectory = path.join(this.strapi.dirs.static.public, 'uploads');

    return new Writable({
      objectMode: true,
      async write(chunk, _encoding, callback) {
        const entryPath = path.join(assetsDirectory, chunk.file);
        const writableStream = fse.createWriteStream(entryPath);

        chunk.stream
          .pipe(writableStream)
          .on('close', () => callback())
          .on('error', callback);
      },
    });
  }

  async getConfigurationStream(): Promise<Writable> {
    if (!this.strapi) {
      throw new Error('Not able to stream Configurations. Strapi instance not found');
    }

    return new Writable({
      objectMode: true,
      write: async (config: IConfiguration<any>, _encoding, callback) => {
        try {
          if (this.options.strategy === 'restore' && this.strapi) {
            await restoreConfigs(this.strapi, config);
          }
          callback();
        } catch (error) {
          callback(
            new Error(
              `Failed to import ${chalk.yellowBright(config.type)} (${chalk.greenBright(
                config.value.id
              )}`
            )
          );
        }
      },
    });
  }
}
