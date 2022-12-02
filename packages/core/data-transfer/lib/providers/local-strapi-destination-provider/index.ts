// import { createLogger } from '@strapi/logger';
import type { IDestinationProvider, IMetadata, ProviderType } from '../../../types';
import { deleteAllRecords, DeleteOptions } from './restore';

import chalk from 'chalk';
import { Writable } from 'stream';

import { mapSchemasValues } from '../../utils';

export const VALID_STRATEGIES = ['restore', 'merge'];

interface ILocalStrapiDestinationProviderOptions {
  getStrapi(): Strapi.Strapi | Promise<Strapi.Strapi>;
  restore?: DeleteOptions;
  strategy: 'restore' | 'merge';
}

// TODO: getting some type errors with @strapi/logger that need to be resolved first
// const log = createLogger();
const log = console;

export const createLocalStrapiDestinationProvider = (
  options: ILocalStrapiDestinationProviderOptions
) => {
  return new LocalStrapiDestinationProvider(options);
};

class LocalStrapiDestinationProvider implements IDestinationProvider {
  name: string = 'destination::local-strapi';
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
      throw new Error('Invalid stategy ' + this.options.strategy);
    }
  }

  async #deleteAll() {
    if (!this.strapi) {
      throw new Error('Strapi instance not found');
    }
    return await deleteAllRecords(this.strapi, this.options.restore);
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
}
