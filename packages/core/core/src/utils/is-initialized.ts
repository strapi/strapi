import { isEmpty, isNil } from 'lodash/fp';

import type { Core } from '@strapi/types';

/**
 * Test if the strapi application is considered as initialized (1st user has been created)
 */
export const isInitialized = async (strapi: Core.Strapi): Promise<boolean> => {
  try {
    if (isEmpty(strapi.admin)) {
      return true;
    }

    // test if there is at least one admin
    const anyAdministrator = await strapi.db.query('admin::user').findOne({ select: ['id'] });

    return !isNil(anyAdministrator);
  } catch (err) {
    strapi.stopWithError(err);
  }
};
