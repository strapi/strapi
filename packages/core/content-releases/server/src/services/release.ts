import { setCreatorFields, errors } from '@strapi/utils';
import type { LoadedStrapi, Common, EntityService, UID } from '@strapi/types';
import { RELEASE_ACTION_MODEL_UID, RELEASE_MODEL_UID } from '../constants';
import type {
  GetReleases,
  CreateRelease,
  UpdateRelease,
  GetRelease,
  Release,
} from '../../../shared/contracts/releases';
import type {
  CreateReleaseAction,
  GetReleaseActions,
} from '../../../shared/contracts/release-actions';
import type { UserInfo } from '../../../shared/types';
import { getService } from '../utils';

const createReleaseService = ({ strapi }: { strapi: LoadedStrapi }) => ({
  async create(releaseData: CreateRelease.Request['body'], { user }: { user: UserInfo }) {
    const releaseWithCreatorFields = await setCreatorFields({ user })(releaseData);

    return strapi.entityService.create(RELEASE_MODEL_UID, {
      data: releaseWithCreatorFields,
    });
  },
  findPage(query?: GetReleases.Request['query']) {
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
  findOne(id: GetRelease.Request['params']['id'], query = {}) {
    return strapi.entityService.findOne(RELEASE_MODEL_UID, id, query);
  },
  findMany(query?: GetReleases.Request['query']) {
    return strapi.entityService.findMany(RELEASE_MODEL_UID, {
      ...query,
      populate: {
        actions: {
          // @ts-expect-error TS error on populate, is not considering count
          count: true,
        },
      },
    });
  },
  async update(
    id: number,
    releaseData: UpdateRelease.Request['body'],
    { user }: { user: UserInfo }
  ) {
    const updatedRelease = await setCreatorFields({ user, isEdition: true })(releaseData);

    const release = await strapi.entityService.update(RELEASE_MODEL_UID, id, {
      /*
       * The type returned from the entity service: Partial<Input<"plugin::content-releases.release">>
       * is not compatible with the type we are passing here: UpdateRelease.Request['body']
       */
      // @ts-expect-error see above
      data: updatedRelease,
    });

    if (!release) {
      throw new errors.NotFoundError(`No release found for id ${id}`);
    }

    return release;
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
  async findActions(
    releaseId: GetReleaseActions.Request['params']['releaseId'],
    contentTypes: Common.UID.ContentType[],
    query?: GetReleaseActions.Request['query']
  ) {
    const result = await strapi.entityService.findOne(RELEASE_MODEL_UID, releaseId);

    if (!result) {
      throw new errors.NotFoundError(`No release found for id ${releaseId}`);
    }

    return strapi.entityService.findPage(RELEASE_ACTION_MODEL_UID, {
      ...query,
      filters: {
        release: releaseId,
        contentType: {
          $in: contentTypes,
        },
      },
    });
  },
  async countActions(query: EntityService.Params.Pick<typeof RELEASE_ACTION_MODEL_UID, 'filters'>) {
    return strapi.entityService.count(RELEASE_ACTION_MODEL_UID, query);
  },
  async findReleaseContentTypesMainFields(releaseId: Release['id']) {
    const contentTypesFromReleaseActions: { contentType: UID.ContentType }[] = await strapi.db
      .queryBuilder(RELEASE_ACTION_MODEL_UID)
      .select('content_type')
      .where({
        $and: [
          {
            release: releaseId,
          },
        ],
      })
      .groupBy('content_type')
      .execute();

    const contentTypesUids = contentTypesFromReleaseActions.map(
      ({ contentType: contentTypeUid }) => contentTypeUid
    );

    const contentManagerContentTypeService = strapi
      .plugin('content-manager')
      .service('content-types');
    const contentTypesMeta: Record<UID.ContentType, { mainField: string }> = {};

    for (const contentTypeUid of contentTypesUids) {
      const contentTypeConfig = await contentManagerContentTypeService.findConfiguration({
        uid: contentTypeUid,
      });

      if (contentTypeConfig) {
        contentTypesMeta[contentTypeUid] = {
          mainField: contentTypeConfig.settings.mainField,
        };
      }
    }

    return contentTypesMeta;
  },
});

export default createReleaseService;
