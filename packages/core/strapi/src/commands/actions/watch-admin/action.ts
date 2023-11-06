import { watchAdmin } from '@strapi/admin';
import { CLIContext } from '../../types';

interface WatchAdminOptions extends CLIContext {
  browser: boolean;
}

export default async ({ browser, logger }: WatchAdminOptions) => {
  logger.warn('[@strapi/strapi]: watch-admin is deprecated, please use strapi develop instead');

  await watchAdmin({
    browser,
  });
};
