import { setCreatorFields, errors } from '@strapi/utils';

import type { LoadedStrapi, EntityService, UID, Schema } from '@strapi/types';

import _ from 'lodash/fp';

import { RELEASE_ACTION_MODEL_UID, RELEASE_MODEL_UID } from '../constants';
import type {
  GetReleases,
  CreateRelease,
  UpdateRelease,
  PublishRelease,
  GetRelease,
  Release,
  DeleteRelease,
  GetContentTypeEntryReleases,
} from '../../../shared/contracts/releases';
import type {
  CreateReleaseAction,
  GetReleaseActions,
  ReleaseAction,
  UpdateReleaseAction,
  DeleteReleaseAction,
  ReleaseActionGroupBy,
} from '../../../shared/contracts/release-actions';
import type { Entity, UserInfo } from '../../../shared/types';
import { getService } from '../utils';

export interface Locale extends Entity {
  name: string;
  code: string;
}

type LocaleDictionary = {
  [key: Locale['code']]: Pick<Locale, 'name' | 'code'>;
};

const getGroupName = (queryValue?: ReleaseActionGroupBy) => {
  switch (queryValue) {
    case 'contentType':
      return 'contentType.displayName';
    case 'action':
      return 'type';
    case 'locale':
      return _.getOr('No locale', 'locale.name');
    default:
      return 'contentType.displayName';
  }
};

const createReleaseService = ({ strapi }: { strapi: LoadedStrapi }) => ({
  async create(releaseData: CreateRelease.Request['body'], { user }: { user: UserInfo }) {
    const releaseWithCreatorFields = await setCreatorFields({ user })(releaseData);

    const { validatePendingReleasesLimit, validateUniqueNameForPendingRelease } = getService(
      'release-validation',
      { strapi }
    );

    await Promise.all([
      validatePendingReleasesLimit(),
      validateUniqueNameForPendingRelease(releaseWithCreatorFields.name),
    ]);

    return strapi.entityService.create(RELEASE_MODEL_UID, {
      data: releaseWithCreatorFields,
    });
  },

  async findOne(id: GetRelease.Request['params']['id'], query = {}) {
    const release = await strapi.entityService.findOne(RELEASE_MODEL_UID, id, {
      ...query,
    });

    return release;
  },

  findPage(query?: GetReleases.Request['query']) {
    return strapi.entityService.findPage(RELEASE_MODEL_UID, {
      ...query,
      populate: {
        actions: {
          // @ts-expect-error Ignore missing properties
          count: true,
        },
      },
    });
  },

  async findManyWithContentTypeEntryAttached(
    contentTypeUid: GetContentTypeEntryReleases.Request['query']['contentTypeUid'],
    entryId: GetContentTypeEntryReleases.Request['query']['entryId']
  ) {
    const releases = await strapi.db.query(RELEASE_MODEL_UID).findMany({
      where: {
        actions: {
          target_type: contentTypeUid,
          target_id: entryId,
        },
        releasedAt: {
          $null: true,
        },
      },
      populate: {
        // Filter the action to get only the content type entry
        actions: {
          where: {
            target_type: contentTypeUid,
            target_id: entryId,
          },
        },
      },
    });

    return releases.map((release) => {
      if (release.actions?.length) {
        const [actionForEntry] = release.actions;

        // Remove the actions key to replace it with an action key
        delete release.actions;

        return {
          ...release,
          action: actionForEntry,
        };
      }

      return release;
    });
  },

  async findManyWithoutContentTypeEntryAttached(
    contentTypeUid: GetContentTypeEntryReleases.Request['query']['contentTypeUid'],
    entryId: GetContentTypeEntryReleases.Request['query']['entryId']
  ) {
    // We get the list of releases where the entry is present
    const releasesRelated = await strapi.db.query(RELEASE_MODEL_UID).findMany({
      where: {
        releasedAt: {
          $null: true,
        },
        actions: {
          target_type: contentTypeUid,
          target_id: entryId,
        },
      },
    });

    const releases = await strapi.db.query(RELEASE_MODEL_UID).findMany({
      where: {
        $or: [
          {
            id: {
              $notIn: releasesRelated.map((release) => release.id),
            },
          },
          {
            actions: null,
          },
        ],
        releasedAt: {
          $null: true,
        },
      },
    });

    return releases.map((release) => {
      if (release.actions?.length) {
        const [actionForEntry] = release.actions;

        // Remove the actions key to replace it with an action key
        delete release.actions;

        return {
          ...release,
          action: actionForEntry,
        };
      }

      return release;
    });
  },

  async update(
    id: number,
    releaseData: UpdateRelease.Request['body'],
    { user }: { user: UserInfo }
  ) {
    const releaseWithCreatorFields = await setCreatorFields({ user, isEdition: true })(releaseData);

    const release = await strapi.entityService.findOne(RELEASE_MODEL_UID, id);

    if (!release) {
      throw new errors.NotFoundError(`No release found for id ${id}`);
    }

    if (release.releasedAt) {
      throw new errors.ValidationError('Release already published');
    }

    const updatedRelease = await strapi.entityService.update(RELEASE_MODEL_UID, id, {
      /*
       * The type returned from the entity service: Partial<Input<"plugin::content-releases.release">>
       * is not compatible with the type we are passing here: UpdateRelease.Request['body']
       */
      // @ts-expect-error see above
      data: releaseWithCreatorFields,
    });

    return updatedRelease;
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

    const release = await strapi.entityService.findOne(RELEASE_MODEL_UID, releaseId);

    if (!release) {
      throw new errors.NotFoundError(`No release found for id ${releaseId}`);
    }

    if (release.releasedAt) {
      throw new errors.ValidationError('Release already published');
    }

    const { entry, type } = action;

    return strapi.entityService.create(RELEASE_ACTION_MODEL_UID, {
      data: {
        type,
        contentType: entry.contentType,
        locale: entry.locale,
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
    query?: GetReleaseActions.Request['query']
  ) {
    const release = await strapi.entityService.findOne(RELEASE_MODEL_UID, releaseId, {
      fields: ['id'],
    });

    if (!release) {
      throw new errors.NotFoundError(`No release found for id ${releaseId}`);
    }

    return strapi.entityService.findPage(RELEASE_ACTION_MODEL_UID, {
      ...query,
      populate: {
        entry: {
          populate: '*',
        },
      },
      filters: {
        release: releaseId,
      },
    });
  },

  async countActions(query: EntityService.Params.Pick<typeof RELEASE_ACTION_MODEL_UID, 'filters'>) {
    return strapi.entityService.count(RELEASE_ACTION_MODEL_UID, query);
  },

  async groupActions(actions: ReleaseAction[], groupBy: ReleaseActionGroupBy) {
    const contentTypeUids = actions.reduce<ReleaseAction['contentType'][]>((acc, action) => {
      if (!acc.includes(action.contentType)) {
        acc.push(action.contentType);
      }

      return acc;
    }, []);
    const allReleaseContentTypesDictionary = await this.getContentTypesDataForActions(
      contentTypeUids
    );
    const allLocalesDictionary = await this.getLocalesDataForActions();

    const formattedData = actions.map((action: ReleaseAction) => {
      const { mainField, displayName } = allReleaseContentTypesDictionary[action.contentType];

      return {
        ...action,
        locale: action.locale ? allLocalesDictionary[action.locale] : null,
        contentType: {
          displayName,
          mainFieldValue: action.entry[mainField],
          uid: action.contentType,
        },
      };
    });

    const groupName = getGroupName(groupBy);
    return _.groupBy(groupName)(formattedData);
  },

  async getLocalesDataForActions() {
    if (!strapi.plugin('i18n')) {
      return {};
    }

    const allLocales: Locale[] = (await strapi.plugin('i18n').service('locales').find()) || [];
    return allLocales.reduce<LocaleDictionary>((acc, locale) => {
      acc[locale.code] = { name: locale.name, code: locale.code };

      return acc;
    }, {});
  },

  async getContentTypesDataForActions(contentTypesUids: ReleaseAction['contentType'][]) {
    const contentManagerContentTypeService = strapi
      .plugin('content-manager')
      .service('content-types');

    const contentTypesData: Record<UID.ContentType, { mainField: string; displayName: string }> =
      {};
    for (const contentTypeUid of contentTypesUids) {
      const contentTypeConfig = await contentManagerContentTypeService.findConfiguration({
        uid: contentTypeUid,
      });

      contentTypesData[contentTypeUid] = {
        mainField: contentTypeConfig.settings.mainField,
        displayName: strapi.getModel(contentTypeUid).info.displayName,
      };
    }

    return contentTypesData;
  },

  getContentTypeModelsFromActions(actions: ReleaseAction[]) {
    const contentTypeUids = actions.reduce<ReleaseAction['contentType'][]>((acc, action) => {
      if (!acc.includes(action.contentType)) {
        acc.push(action.contentType);
      }

      return acc;
    }, []);

    const contentTypeModelsMap = contentTypeUids.reduce(
      (
        acc: { [key: ReleaseAction['contentType']]: Schema.ContentType },
        contentTypeUid: ReleaseAction['contentType']
      ) => {
        acc[contentTypeUid] = strapi.getModel(contentTypeUid);

        return acc;
      },
      {}
    );

    return contentTypeModelsMap;
  },

  async getAllComponents() {
    const contentManagerComponentsService = strapi.plugin('content-manager').service('components');

    const components = await contentManagerComponentsService.findAllComponents();

    const componentsMap = components.reduce(
      (acc: { [key: Schema.Component['uid']]: Schema.Component }, component: Schema.Component) => {
        acc[component.uid] = component;

        return acc;
      },
      {}
    );

    return componentsMap;
  },

  async delete(releaseId: DeleteRelease.Request['params']['id']) {
    const release = (await strapi.entityService.findOne(RELEASE_MODEL_UID, releaseId, {
      populate: {
        actions: {
          fields: ['id'],
        },
      },
    })) as unknown as Release;

    if (!release) {
      throw new errors.NotFoundError(`No release found for id ${releaseId}`);
    }

    if (release.releasedAt) {
      throw new errors.ValidationError('Release already published');
    }

    // Only delete the release and its actions is you in fact can delete all the actions and the release
    // Otherwise, if the transaction fails it throws an error
    await strapi.db.transaction(async () => {
      await strapi.db.query(RELEASE_ACTION_MODEL_UID).deleteMany({
        where: {
          id: {
            $in: release.actions.map((action) => action.id),
          },
        },
      });
      await strapi.entityService.delete(RELEASE_MODEL_UID, releaseId);
    });

    return release;
  },

  async publish(releaseId: PublishRelease.Request['params']['id']) {
    // We need to pass the type because entityService.findOne is not returning the correct type
    const releaseWithPopulatedActionEntries = (await strapi.entityService.findOne(
      RELEASE_MODEL_UID,
      releaseId,
      {
        populate: {
          actions: {
            populate: {
              entry: {
                fields: ['id'],
              },
            },
          },
        },
      }
    )) as unknown as Release;

    if (!releaseWithPopulatedActionEntries) {
      throw new errors.NotFoundError(`No release found for id ${releaseId}`);
    }

    if (releaseWithPopulatedActionEntries.releasedAt) {
      throw new errors.ValidationError('Release already published');
    }

    if (releaseWithPopulatedActionEntries.actions.length === 0) {
      throw new errors.ValidationError('No entries to publish');
    }

    /**
     * We separate publish and unpublish actions group by content type
     * And we keep only their ids to fetch them later to get all information needed
     */
    const actions: {
      [key: UID.ContentType]: {
        entriestoPublishIds: ReleaseAction['entry']['id'][];
        entriesToUnpublishIds: ReleaseAction['entry']['id'][];
      };
    } = {};
    for (const action of releaseWithPopulatedActionEntries.actions) {
      const contentTypeUid = action.contentType;

      if (!actions[contentTypeUid]) {
        actions[contentTypeUid] = {
          entriestoPublishIds: [],
          entriesToUnpublishIds: [],
        };
      }

      if (action.type === 'publish') {
        actions[contentTypeUid].entriestoPublishIds.push(action.entry.id);
      } else {
        actions[contentTypeUid].entriesToUnpublishIds.push(action.entry.id);
      }
    }

    const entityManagerService = strapi.plugin('content-manager').service('entity-manager');
    const populateBuilderService = strapi.plugin('content-manager').service('populate-builder');

    // Only publish the release if all action updates are applied successfully to their entry, otherwise leave everything as is
    await strapi.db.transaction(async () => {
      for (const contentTypeUid of Object.keys(actions)) {
        // @ts-expect-error - populateBuilderService should be a function but is returning service
        const populate = await populateBuilderService(contentTypeUid)
          .populateDeep(Infinity)
          .build();

        const { entriestoPublishIds, entriesToUnpublishIds } =
          actions[contentTypeUid as UID.ContentType];

        /**
         * We need to get the populate entries to be able to publish without errors on components/relations/dynamicZones
         * Considering that populate doesn't work well with morph relations we can't get the entries from the Release model
         * So, we need to fetch them manually
         */
        const entriesToPublish = (await strapi.entityService.findMany(
          contentTypeUid as UID.ContentType,
          {
            filters: {
              id: {
                $in: entriestoPublishIds,
              },
            },
            populate,
          }
        )) as Entity[];

        const entriesToUnpublish = (await strapi.entityService.findMany(
          contentTypeUid as UID.ContentType,
          {
            filters: {
              id: {
                $in: entriesToUnpublishIds,
              },
            },
            populate,
          }
        )) as Entity[];

        if (entriesToPublish.length > 0) {
          await entityManagerService.publishMany(entriesToPublish, contentTypeUid);
        }

        if (entriesToUnpublish.length > 0) {
          await entityManagerService.unpublishMany(entriesToUnpublish, contentTypeUid);
        }
      }
    });

    // When the transaction fails it throws an error, when it is successful proceed to updating the release
    const release = await strapi.entityService.update(RELEASE_MODEL_UID, releaseId, {
      data: {
        /*
         * The type returned from the entity service: Partial<Input<"plugin::content-releases.release">> looks like it's wrong
         */
        // @ts-expect-error see above
        releasedAt: new Date(),
      },
    });

    return release;
  },

  async updateAction(
    actionId: UpdateReleaseAction.Request['params']['actionId'],
    releaseId: UpdateReleaseAction.Request['params']['releaseId'],
    update: UpdateReleaseAction.Request['body']
  ) {
    const updatedAction = await strapi.db.query(RELEASE_ACTION_MODEL_UID).update({
      where: {
        id: actionId,
        release: {
          id: releaseId,
          releasedAt: {
            $null: true,
          },
        },
      },
      data: update,
    });

    if (!updatedAction) {
      throw new errors.NotFoundError(
        `Action with id ${actionId} not found in release with id ${releaseId} or it is already published`
      );
    }

    return updatedAction;
  },

  async deleteAction(
    actionId: DeleteReleaseAction.Request['params']['actionId'],
    releaseId: DeleteReleaseAction.Request['params']['releaseId']
  ) {
    const deletedAction = await strapi.db.query(RELEASE_ACTION_MODEL_UID).delete({
      where: {
        id: actionId,
        release: {
          id: releaseId,
          releasedAt: {
            $null: true,
          },
        },
      },
    });

    if (!deletedAction) {
      throw new errors.NotFoundError(
        `Action with id ${actionId} not found in release with id ${releaseId} or it is already published`
      );
    }

    return deletedAction;
  },
});

export default createReleaseService;
