import { Writable } from 'stream';
import { omit } from 'lodash/fp';
import chalk from 'chalk';
import type { Core } from '@strapi/types';
import { ProviderTransferError } from '../../../../../errors/providers';
import { IConfiguration, Transaction } from '../../../../../../types';

const omitInvalidCreationAttributes = omit(['id']);

const restoreCoreStore = async <T extends { value: unknown }>(strapi: Core.Strapi, values: T) => {
  const data = omitInvalidCreationAttributes(values);
  return strapi.db.query('strapi::core-store').create({
    data: {
      ...data,
      value: JSON.stringify(data.value),
    },
  });
};

const restoreWebhooks = async <T extends { value: unknown }>(strapi: Core.Strapi, values: T) => {
  const data = omitInvalidCreationAttributes(values);
  return strapi.db.query('strapi::webhook').create({ data });
};

export const restoreConfigs = async (strapi: Core.Strapi, config: IConfiguration) => {
  if (config.type === 'core-store') {
    return restoreCoreStore(strapi, config.value as { value: unknown });
  }

  if (config.type === 'webhook') {
    return restoreWebhooks(strapi, config.value as { value: unknown });
  }
};

export const createConfigurationWriteStream = async (
  strapi: Core.Strapi,
  transaction?: Transaction
) => {
  return new Writable({
    objectMode: true,
    async write<T extends { id: number }>(
      config: IConfiguration<T>,
      _encoding: BufferEncoding,
      callback: (error?: Error | null) => void
    ) {
      await transaction?.attach(async () => {
        try {
          await restoreConfigs(strapi, config);
        } catch (error) {
          return callback(
            new ProviderTransferError(
              `Failed to import ${chalk.yellowBright(config.type)} (${chalk.greenBright(
                config.value.id
              )}`
            )
          );
        }
        callback();
      });
    },
  });
};
