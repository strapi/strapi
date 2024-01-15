import { watchAdmin } from '@strapi/admin';
import { CLIContext } from '../../types';

interface WatchAdminOptions {
  browser: boolean;
}

export default async ({ browser }: WatchAdminOptions, _cmd: unknown, { logger }: CLIContext) => {
  logger.warn('[@strapi/strapi]: watch-admin is deprecated, please use strapi develop instead');

  await watchAdmin({
    browser,
  });
};
