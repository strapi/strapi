import { setCreatorFields } from '@strapi/utils';
import type { LoadedStrapi } from '@strapi/types';
import { RELEASE_ACTION_MODEL_UID, RELEASE_MODEL_UID } from '../constants';
import type { ReleaseCreateArgs, UserInfo, ReleaseActionCreateArgs } from '../../../shared/types';
import { getService } from '../utils';

const createReleaseService = ({ strapi }: { strapi: LoadedStrapi }) => ({
  async create(releaseData: ReleaseCreateArgs, { user }: { user: UserInfo }) {
    const releaseWithCreatorFields = await setCreatorFields({ user })(releaseData);

    const release = await strapi.entityService.create(RELEASE_MODEL_UID, {
      data: releaseWithCreatorFields,
    });

    return release;
  },
  async findMany(query: Record<string, unknown>) {
    const { results, pagination } = await strapi.entityService.findPage(RELEASE_MODEL_UID, {
      ...query,
      populate: {
        actions: {
          // @ts-expect-error TS error on populate, is not considering count
          count: true,
        },
      },
    });

    return {
      data: results,
      pagination,
    };
  },
  async createAction(
    releaseId: ReleaseActionCreateArgs['releaseId'],
    action: Pick<ReleaseActionCreateArgs, 'type' | 'entry'>
  ) {
    const { validateEntryContentType, validateUniqueEntry } = getService('release-validation', {
      strapi,
    });

    await Promise.all([
      validateEntryContentType({ releaseId, ...action }),
      validateUniqueEntry({ releaseId, ...action }),
    ]);

    const { entry, type } = action;

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
