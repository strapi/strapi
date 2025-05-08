import { setCreatorFields, errors } from '@strapi/utils';

import type { Core, Struct, UID, Data } from '@strapi/types';

import { ALLOWED_WEBHOOK_EVENTS, RELEASE_ACTION_MODEL_UID, RELEASE_MODEL_UID } from '../constants';
import type {
  GetReleases,
  CreateRelease,
  UpdateRelease,
  PublishRelease,
  GetRelease,
  Release,
  DeleteRelease,
} from '../../../shared/contracts/releases';
import type { Entity, UserInfo } from '../../../shared/types';
import { getService } from '../utils';
import { Tree, ReleaseTreeNode, TreeNodeProps, EntriesInRelease } from '../utils/tree';

const createReleaseService = ({ strapi }: { strapi: Core.Strapi }) => {
  const dispatchWebhook = (
    event: string,
    { isPublished, release, error }: { isPublished: boolean; release?: any; error?: unknown }
  ) => {
    strapi.eventHub.emit(event, {
      isPublished,
      error,
      release,
    });
  };

  return {
    async create(releaseData: CreateRelease.Request['body'], { user }: { user: UserInfo }) {
      const releaseWithCreatorFields = await setCreatorFields({ user })(releaseData);

      const {
        validatePendingReleasesLimit,
        validateUniqueNameForPendingRelease,
        validateScheduledAtIsLaterThanNow,
      } = getService('release-validation', { strapi });

      await Promise.all([
        validatePendingReleasesLimit(),
        validateUniqueNameForPendingRelease(releaseWithCreatorFields.name),
        validateScheduledAtIsLaterThanNow(releaseWithCreatorFields.scheduledAt),
      ]);

      const release = await strapi.db.query(RELEASE_MODEL_UID).create({
        data: {
          ...releaseWithCreatorFields,
          status: 'empty',
        },
      });

      if (releaseWithCreatorFields.scheduledAt) {
        const schedulingService = getService('scheduling', { strapi });

        await schedulingService.set(release.id, release.scheduledAt);
      }

      strapi.telemetry.send('didCreateContentRelease');

      return release;
    },

    async findOne(id: GetRelease.Request['params']['id'], query = {}) {
      const dbQuery = strapi.get('query-params').transform(RELEASE_MODEL_UID, query);
      const release = await strapi.db.query(RELEASE_MODEL_UID).findOne({
        ...dbQuery,
        where: { id },
      });

      return release;
    },

    findPage(query?: GetReleases.Request['query']) {
      const dbQuery = strapi.get('query-params').transform(RELEASE_MODEL_UID, query ?? {});

      return strapi.db.query(RELEASE_MODEL_UID).findPage({
        ...dbQuery,
        populate: {
          actions: {
            count: true,
          },
        },
      });
    },

    findMany(query?: any) {
      const dbQuery = strapi.get('query-params').transform(RELEASE_MODEL_UID, query ?? {});

      return strapi.db.query(RELEASE_MODEL_UID).findMany({
        ...dbQuery,
      });
    },

    async update(
      id: Data.ID,
      releaseData: UpdateRelease.Request['body'],
      { user }: { user: UserInfo }
    ) {
      const releaseWithCreatorFields = await setCreatorFields({ user, isEdition: true })(
        releaseData
      );

      const { validateUniqueNameForPendingRelease, validateScheduledAtIsLaterThanNow } = getService(
        'release-validation',
        { strapi }
      );

      await Promise.all([
        validateUniqueNameForPendingRelease(releaseWithCreatorFields.name, id),
        validateScheduledAtIsLaterThanNow(releaseWithCreatorFields.scheduledAt),
      ]);

      const release = await strapi.db.query(RELEASE_MODEL_UID).findOne({ where: { id } });

      if (!release) {
        throw new errors.NotFoundError(`No release found for id ${id}`);
      }

      if (release.releasedAt) {
        throw new errors.ValidationError('Release already published');
      }

      const updatedRelease = await strapi.db.query(RELEASE_MODEL_UID).update({
        where: { id },
        data: releaseWithCreatorFields,
      });

      const schedulingService = getService('scheduling', { strapi });

      if (releaseData.scheduledAt) {
        // set function always cancel the previous job if it exists, so we can call it directly
        await schedulingService.set(id, releaseData.scheduledAt);
      } else if (release.scheduledAt) {
        // When user don't send a scheduledAt and we have one on the release, means that user want to unschedule it
        schedulingService.cancel(id);
      }

      this.updateReleaseStatus(id);

      strapi.telemetry.send('didUpdateContentRelease');

      return updatedRelease;
    },

    async getAllComponents() {
      const contentManagerComponentsService = strapi
        .plugin('content-manager')
        .service('components');

      const components = await contentManagerComponentsService.findAllComponents();

      const componentsMap = components.reduce(
        (
          acc: { [key: Struct.ComponentSchema['uid']]: Struct.ComponentSchema },
          component: Struct.ComponentSchema
        ) => {
          acc[component.uid] = component;

          return acc;
        },
        {}
      );

      return componentsMap;
    },

    async delete(releaseId: DeleteRelease.Request['params']['id']) {
      const release: Release = await strapi.db.query(RELEASE_MODEL_UID).findOne({
        where: { id: releaseId },
        populate: {
          actions: {
            select: ['id'],
          },
        },
      });

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

        await strapi.db.query(RELEASE_MODEL_UID).delete({
          where: {
            id: releaseId,
          },
        });
      });

      if (release.scheduledAt) {
        const schedulingService = getService('scheduling', { strapi });
        await schedulingService.cancel(release.id);
      }

      strapi.telemetry.send('didDeleteContentRelease');

      return release;
    },

    async publish(releaseId: PublishRelease.Request['params']['id'], tree: ReleaseTreeNode[]) {
      const {
        release,
        error,
      }: { release: Pick<Release, 'id' | 'releasedAt' | 'status'> | null; error: unknown | null } =
        await strapi.db.transaction(async ({ trx }) => {
          /**
           * We lock the release in this transaction, so any other process trying to publish it will wait until this transaction is finished
           * In this transaction we don't care about rollback, becasue we want to persist the lock until the end and if it fails we want to change the release status to failed
           */
          const lockedRelease = (await strapi.db
            ?.queryBuilder(RELEASE_MODEL_UID)
            .where({ id: releaseId })
            .select(['id', 'name', 'releasedAt', 'status'])
            .first()
            .transacting(trx)
            .forUpdate()
            .execute()) as Pick<Release, 'id' | 'name' | 'releasedAt' | 'status'> | undefined;

          if (!lockedRelease) {
            throw new errors.NotFoundError(`No release found for id ${releaseId}`);
          }

          if (lockedRelease.releasedAt) {
            throw new errors.ValidationError('Release already published');
          }

          if (tree.length === 0) {
            throw new errors.ValidationError('No entries to publish');
          }

          if (lockedRelease.status === 'failed') {
            throw new errors.ValidationError('Release failed to publish');
          }

          try {
            strapi.log.info(`[Content Releases] Starting to publish release ${lockedRelease.name}`);

            await strapi.db.transaction(async () => {
              const releaseTree = structuredClone(tree);
              for (const node of releaseTree) {
                switch (node.type) {
                  case 'publish':
                    await strapi.documents(node.contentType as UID.ContentType).publish({
                      documentId: node.documentId,
                      contentType: node.contentType,
                      locale: node.locale,
                    });
                    break;
                  case 'unpublish':
                    await strapi.documents(node.contentType as UID.ContentType).unpublish({
                      documentId: node.documentId,
                      contentType: node.contentType,
                      locale: node.locale,
                    });
                    break;
                  default:
                    break;
                }
                if (node.children) {
                  releaseTree.push(...node.children);
                }
              }
            });

            const release = await strapi.db.query(RELEASE_MODEL_UID).update({
              where: {
                id: releaseId,
              },
              data: {
                status: 'done',
                releasedAt: new Date(),
              },
            });

            dispatchWebhook(ALLOWED_WEBHOOK_EVENTS.RELEASES_PUBLISH, {
              isPublished: true,
              release,
            });

            strapi.telemetry.send('didPublishContentRelease');

            return { release, error: null };
          } catch (error) {
            dispatchWebhook(ALLOWED_WEBHOOK_EVENTS.RELEASES_PUBLISH, {
              isPublished: false,
              error,
            });

            // We need to run the update in the same transaction because the release is locked
            await strapi.db
              ?.queryBuilder(RELEASE_MODEL_UID)
              .where({ id: releaseId })
              .update({
                status: 'failed',
              })
              .transacting(trx)
              .execute();

            // At this point, we don't want to throw the error because if that happen we rollback the change in the release status
            // We want to throw the error after the transaction is finished, so we return the error
            return {
              release: null,
              error,
            };
          }
        });

      // Now the first transaction is commited, we can safely throw the error if it exists
      if (error instanceof Error) {
        throw error;
      }

      return release;
    },

    async updateReleaseStatus(releaseId: Release['id']) {
      const releaseActionService = getService('release-action', { strapi });

      const [totalActions, invalidActions] = await Promise.all([
        releaseActionService.countActions({
          filters: {
            release: releaseId,
          },
        }),
        releaseActionService.countActions({
          filters: {
            release: releaseId,
            isEntryValid: false,
          },
        }),
      ]);

      if (totalActions > 0) {
        if (invalidActions > 0) {
          return strapi.db.query(RELEASE_MODEL_UID).update({
            where: {
              id: releaseId,
            },
            data: {
              status: 'blocked',
            },
          });
        }

        return strapi.db.query(RELEASE_MODEL_UID).update({
          where: {
            id: releaseId,
          },
          data: {
            status: 'ready',
          },
        });
      }

      return strapi.db.query(RELEASE_MODEL_UID).update({
        where: {
          id: releaseId,
        },
        data: {
          status: 'empty',
        },
      });
    },
    async buildReleaseTree(
      entriesInRelease: EntriesInRelease[],
      contentTypeModelsMap: Record<string, Struct.ContentTypeSchema>
    ) {
      const relationFieldsFromContentTypeModelsMap = Object.entries(contentTypeModelsMap).reduce(
        (acc, [contentType, modelDef]) => {
          const fields = Object.entries(modelDef.attributes).filter(
            ([_, attr]) =>
              attr.type === 'relation' &&
              !['updatedBy', 'createdBy', 'localizations'].includes(_) &&
              !_.startsWith('strapi_')
          ) as [string, Record<string, unknown>][];
          acc[contentType] = fields;
          return acc;
        },
        {} as Record<string, [string, unknown][]>
      );

      const documentsInReleaseByModel = new Map<string, Set<string>>();
      const tree = new Tree();

      for (const { contentType, entry } of entriesInRelease) {
        const set = documentsInReleaseByModel.get(contentType) ?? new Set<string>();
        set.add(entry.id.toString());
        documentsInReleaseByModel.set(contentType, set);
      }

      for (const { contentType, entry, type } of entriesInRelease) {
        let localeToUse = entry.locale;
        const entryId = entry.id.toString();

        const nodeProps: TreeNodeProps = {
          contentType,
          id: entryId,
          documentId: entry.documentId,
          type,
          locale: localeToUse,
        };

        let currentNode = tree.find({ contentType, id: entryId, locale: localeToUse });
        if (!currentNode) {
          currentNode = tree.add(nodeProps);
        }

        const relationFields = relationFieldsFromContentTypeModelsMap[contentType] || [];
        const parentPropsList: TreeNodeProps[] = [];

        for (const [fieldName, fieldDef] of relationFields as [string, Record<string, unknown>][]) {
          const raw = entry[fieldName];
          const targets = Array.isArray(raw) ? raw : [raw];
          for (const rel of targets as Array<Entity & { locale?: string }>) {
            // eslint-disable-next-line no-continue
            if (!rel) continue;
            const targetModel = fieldDef.target as string;
            const relId = rel.id.toString();
            if (
              documentsInReleaseByModel.get(targetModel)?.has(relId) &&
              !fieldDef.mappedBy &&
              !fieldDef.inversedBy
            ) {
              if (!localeToUse) {
                localeToUse = rel.locale;
              }
              parentPropsList.push({
                contentType: targetModel,
                id: relId,
                documentId: rel.documentId,
                type,
                locale: localeToUse,
              });
            }
          }
        }

        if (parentPropsList.length) {
          const parentNodes = parentPropsList.map((parentProps) => {
            return tree.find(parentProps) ?? tree.add(parentProps);
          });

          const deepest = parentNodes.reduce(
            (parent, currentParent) =>
              currentParent._depth > parent._depth ? currentParent : parent,
            parentNodes[0]
          );

          tree.moveToChildOf(
            { contentType, id: entryId, locale: entry.locale },
            { contentType: deepest.data.contentType, id: deepest.data.id, locale: localeToUse }
          );
        }
      }

      return tree.toReleaseTree();
    },
  };
};

export type ReleaseService = ReturnType<typeof createReleaseService>;

export default createReleaseService;
