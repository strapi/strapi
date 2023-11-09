import type { LoadedStrapi } from '@strapi/types';
import { ACTIONS } from './constants';

export const bootstrap = async ({ strapi }: { strapi: LoadedStrapi }) => {
  await strapi.admin.services.permission.actionProvider.registerMany(ACTIONS);
};