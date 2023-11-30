/* eslint-disable @typescript-eslint/no-var-requires */
import type { LoadedStrapi } from '@strapi/types';
import { ACTIONS } from './constants';

const { features } = require('@strapi/strapi/dist/utils/ee');

export const register = async ({ strapi }: { strapi: LoadedStrapi }) => {
  if (
    features.isEnabled('cms-content-releases') &&
    strapi.features.future.isEnabled('contentReleases')
  ) {
    await strapi.admin.services.permission.actionProvider.registerMany(ACTIONS);
  }
};
