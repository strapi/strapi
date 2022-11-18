// import { createLogger } from '@strapi/logger';
import chalk from 'chalk';
import { Duplex } from 'stream-chain';
import type { IDestinationProvider, IMetadata, ProviderType } from '../../../types';

import { deleteAllRecords, DeleteOptions } from './restore';

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
    this.strapi = await this.options.getStrapi();
  }

  async close(): Promise<void> {
    await this.strapi?.destroy?.();
  }

  async deleteAll() {
    if (!this.strapi) {
      throw new Error('Strapi instance not found');
    }
    return await deleteAllRecords(this.strapi, this.options.restore);
  }

  async beforeStreaming() {
    if (this.options.strategy === 'restore') await this.deleteAll();
  }

  // TODO
  getMetadata(): IMetadata | Promise<IMetadata> {
    return {};
  }

  getEntitiesStream(): Duplex {
    const self = this;

    return new Duplex({
      objectMode: true,
      async write(entity, _encoding, callback) {
        if (!self.strapi) {
          callback(new Error('Strapi instance not found'));
        }

        const { type: uid, id, data } = entity;

        try {
          await strapi.entityService.create(uid, { data });
        } catch (e: any) {
          // TODO: remove "any" cast
          log.warn(
            chalk.bold(`Failed to import ${chalk.yellowBright(uid)} (${chalk.greenBright(id)})`)
          );
          e.details.errors
            .map((err: any, i: number) => {
              // TODO: add correct error type
              const info = {
                uid: chalk.yellowBright(`[${uid}]`),
                path: chalk.blueBright(`[${err.path.join('.')}]`),
                id: chalk.greenBright(`[${id}]`),
                message: err.message,
              };

              return `(${i}) ${info.uid}${info.id}${info.path}: ${info.message}`;
            })
            .forEach((message: string) => log.warn(message));
        } finally {
          callback();
        }
      },
    });
  }
}
