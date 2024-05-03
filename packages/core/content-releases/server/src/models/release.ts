import type { Model } from '@strapi/database';

import { RELEASE_MODEL_UID, RELEASE_ACTION_MODEL_UID } from '../constants';

const release: Model = {
  uid: RELEASE_MODEL_UID,
  tableName: 'strapi_releases',
  singularName: 'release',
  attributes: {
    name: {
      type: 'string',
      required: true,
    },
    releasedAt: {
      type: 'datetime',
    },
    scheduledAt: {
      type: 'datetime',
    },
    timezone: {
      type: 'string',
    },
    status: {
      type: 'enumeration',
      enum: ['ready', 'blocked', 'failed', 'done', 'empty'],
      required: true,
    },
    // @ts-expect-error - joinTable is expected
    actions: {
      type: 'relation',
      relation: 'oneToMany',
      target: RELEASE_ACTION_MODEL_UID,
      mappedBy: 'release',
    },
  },
};

export { release };
