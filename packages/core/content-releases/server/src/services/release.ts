import { setCreatorFields } from '@strapi/utils';
import type { LoadedStrapi } from '@strapi/types';
import { RELEASE_ACTION_MODEL_UID, RELEASE_MODEL_UID } from '../constants';
import type { GetReleases, CreateRelease, GetRelease } from '../../../shared/contracts/releases';
import type { CreateReleaseAction } from '../../../shared/contracts/release-actions';
import type { UserInfo } from '../../../shared/types';
import { getService } from '../utils';

const createReleaseService = ({ strapi }: { strapi: LoadedStrapi }) => ({
  async create(releaseData: CreateRelease.Request['body'], { user }: { user: UserInfo }) {
    const releaseWithCreatorFields = await setCreatorFields({ user })(releaseData);

    return strapi.entityService.create(RELEASE_MODEL_UID, {
      data: releaseWithCreatorFields,
    });
  },
  findMany(query?: GetReleases.Request['query']) {
    return strapi.entityService.findPage(RELEASE_MODEL_UID, {
      ...query,
      populate: {
        actions: {
          // @ts-expect-error TS error on populate, is not considering count
          count: true,
        },
      },
    });
  },
  findOne(id: GetRelease.Request['params']['id']) {
    return strapi.entityService.findOne(RELEASE_MODEL_UID, id, {
      populate: {
        actions: {
          // @ts-expect-error TS error on populate, is not considering count
          count: true,
        },
      },
    });
  },
  async createAction(
    releaseId: CreateReleaseAction.Request['params']['releaseId'],
    action: Pick<CreateReleaseAction.Request['body'], 'type' | 'entry'>
  ) {
    const { validateEntryContentType, validateUniqueEntry } = getService('release-validation', {
      strapi,
    });

    await Promise.all([
      validateEntryContentType(action.entry.contentType),
      validateUniqueEntry(releaseId, action),
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
