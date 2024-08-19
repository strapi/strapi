import { isEmpty, isNil } from 'lodash/fp';

import type { Strapi } from '@strapi/types';

/**
 * Test if the strapi application is considered as initialized (1st user has been created)
 */
export default async function isInitialized(strapi: Strapi): Promise<boolean> {
  try {
    if (isEmpty(strapi.admin)) {
      return true;
    }

    // test if there is at least one admin
    const anyAdministrator = await strapi.query('admin::user').findOne({ select: ['id'] });

    return !isNil(anyAdministrator);
  } catch (err) {
    strapi.stopWithError(err);
  }
}
