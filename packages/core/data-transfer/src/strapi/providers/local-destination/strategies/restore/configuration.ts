import _ from 'lodash';
import { Writable } from 'stream';
import chalk from 'chalk';
import { IConfiguration } from '../../../../../../types';

const restoreCoreStore = async <T extends { value: unknown }>(strapi: Strapi.Strapi, values: T) => {
  const data = _.omit(values, ['id']);
  return strapi.db.query('strapi::core-store').create({
    data: {
      ...data,
      value: JSON.stringify(data.value),
    },
  });
};

const restoreWebhooks = async <T extends { value: unknown }>(strapi: Strapi.Strapi, values: T) => {
  const data = _.omit(values, ['id']);
  return strapi.db.query('webhook').create({ data });
};

export const restoreConfigs = async (strapi: Strapi.Strapi, config: IConfiguration) => {
  if (config.type === 'core-store') {
    return restoreCoreStore(strapi, config.value as { value: unknown });
  }

  if (config.type === 'webhook') {
    return restoreWebhooks(strapi, config.value as { value: unknown });
  }
};

export const createConfigurationWriteStream = async (strapi: Strapi.Strapi, transaction: any) => {
  return new Writable({
    objectMode: true,
    async write<T extends { id: number }>(
      config: IConfiguration<T>,
      _encoding: BufferEncoding,
      callback: (error?: Error | null) => void
    ) {
      return transaction(async () => {
        try {
          await restoreConfigs(strapi, config);
        } catch (error) {
          return callback(
            new Error(
              `Failed to import ${chalk.yellowBright(config.type)} (${chalk.greenBright(error)}`
            )
          );
        }
        callback();
      });
    },
  });
};
