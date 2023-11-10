import type { LoadedStrapi } from '@strapi/types';
import { RELEASE_ACTION_MODEL_UID } from '../constants';
import type { ReleaseActionCreateArgs } from '../types';

const createReleaseService = ({ strapi }: { strapi: LoadedStrapi }) => ({
  create({ releaseId, entry, type }: ReleaseActionCreateArgs) {
    return strapi.entityService.create(RELEASE_ACTION_MODEL_UID, {
      data: {
        type,
        contentType: entry.contentType,
        entry: {
          id: entry.id,
          __type: entry.contentType,
          __pivot: { field: 'entry' },
        },
        release: releaseId,
      },
      populate: { release: { fields: ['id'] }, entry: { fields: ['id'] } },
    });
  },
});

export default createReleaseService;
