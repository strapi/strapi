import type { Model } from '@strapi/database';

import { RELEASE_MODEL_UID, RELEASE_ACTION_MODEL_UID } from '../constants';

const releaseAction: Model = {
  uid: RELEASE_ACTION_MODEL_UID,
  tableName: 'strapi_release_actions',
  singularName: 'release-action',
  attributes: {
    id: {
      type: 'increments',
    },
    type: {
      type: 'enumeration',
      enum: ['publish', 'unpublish'],
      required: true,
    },
    // @ts-expect-error - morphColumn is expected
    entry: {
      type: 'relation',
      relation: 'morphToOne',
    },
    contentType: {
      type: 'string',
      required: true,
    },
    locale: {
      type: 'string',
    },
    // @ts-expect-error - joinTable is expected
    release: {
      type: 'relation',
      relation: 'manyToOne',
      target: RELEASE_MODEL_UID,
      inversedBy: 'actions',
    },
    isEntryValid: {
      type: 'boolean',
    },
  },
};

export { releaseAction };
