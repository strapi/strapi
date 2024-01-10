/* eslint-disable @typescript-eslint/no-var-requires */
import type { LoadedStrapi } from '@strapi/types';
import { ACTIONS } from './constants';

export const register = async ({ strapi }: { strapi: LoadedStrapi }) => {
  if (
    strapi.ee.features.isEnabled('cms-content-releases') &&
    strapi.features.future.isEnabled('contentReleases')
  ) {
    await strapi.admin.services.permission.actionProvider.registerMany(ACTIONS);
  }
};
