import type { UID, Data, Core } from '@strapi/types';

import type { SettingsService } from '../services/settings';
import type { ReleaseService } from '../services/release';
import type { ReleaseActionService } from '../services/release-action';
import { ReleaseTreeNode } from './tree';

type Services = {
  release: ReleaseService;
  'release-validation': any;
  scheduling: any;
  'release-action': ReleaseActionService;
  'event-manager': any;
  settings: SettingsService;
};

interface Action {
  contentType: UID.ContentType;
  documentId?: Data.DocumentID;
  locale?: string;
}

export type TreeNodeProps =  Omit<ReleaseTreeNode, "_depth" | "children">;

export const getService = <TName extends keyof Services>(
  name: TName,
  { strapi }: { strapi: Core.Strapi }
): Services[TName] => {
  return strapi.plugin('content-releases').service(name);
};

export const getDraftEntryValidStatus = async (
  { contentType, documentId, locale }: Action,
  { strapi }: { strapi: Core.Strapi }
) => {
  const populateBuilderService = strapi.plugin('content-manager').service('populate-builder');
  // @ts-expect-error - populateBuilderService should be a function but is returning service
  const populate = await populateBuilderService(contentType).populateDeep(Infinity).build();

  const entry = await getEntry({ contentType, documentId, locale, populate }, { strapi });

  return isEntryValid(contentType, entry, { strapi });
};

export const isEntryValid = async (
  contentTypeUid: string,
  entry: any,
  { strapi }: { strapi: Core.Strapi }
) => {
  try {
    // @TODO: When documents service has validateEntityCreation method, use it instead
    await strapi.entityValidator.validateEntityCreation(
      strapi.getModel(contentTypeUid as UID.ContentType),
      entry,
      undefined,
      // @ts-expect-error - FIXME: entity here is unnecessary
      entry
    );

    const workflowsService = strapi.plugin('review-workflows').service('workflows');
    // Workflows service may not be available depending on the license
    const workflow = await workflowsService?.getAssignedWorkflow(contentTypeUid, {
      populate: 'stageRequiredToPublish',
    });

    if (workflow?.stageRequiredToPublish) {
      return entry.strapi_stage.id === workflow.stageRequiredToPublish.id;
    }

    return true;
  } catch {
    return false;
  }
};

export const getEntry = async (
  {
    contentType,
    documentId,
    locale,
    populate,
    status = 'draft',
    skipDraftFetching = false,
  }: Action & { status?: 'draft' | 'published'; populate: any, skipDraftFetching?: boolean },
  { strapi }: { strapi: Core.Strapi }
) => {
  if (documentId) {
    // Try to get an existing draft or published document
    const entry = await strapi
      .documents(contentType)
      .findOne({ documentId, locale, populate, status });

    if (skipDraftFetching)
      return entry;

    // The document isn't published yet, but the action is to publish it, fetch the draft
    if (status === 'published' && !entry) {
      return strapi
        .documents(contentType)
        .findOne({ documentId, locale, populate, status: 'draft' });
    }

    return entry;
  }

  return strapi.documents(contentType).findFirst({ locale, populate, status });
};

export const getEntryStatus = async (
  contentType: UID.ContentType,
  entry: Data.ContentType,
  { strapi }: { strapi: Core.Strapi }
) => {
  if (entry.publishedAt) {
    return 'published';
  }

  const publishedEntry = await strapi.documents(contentType).findOne({
    documentId: entry.documentId,
    locale: entry.locale,
    status: 'published',
    fields: ['updatedAt'],
  });

  if (!publishedEntry) {
    return 'draft';
  }

  const entryUpdatedAt = new Date(entry.updatedAt).getTime();
  const publishedEntryUpdatedAt = new Date(publishedEntry.updatedAt).getTime();

  if (entryUpdatedAt > publishedEntryUpdatedAt) {
    return 'modified';
  }

  return 'published';
};

export const getReleaseTree = async (releaseId: Data.ID, strapi: Core.Strapi) => {
  const releaseActionService = getService('release-action', { strapi });
  const { results } = await releaseActionService.findPage(releaseId, {
    pageSize: Number.MAX_SAFE_INTEGER,
  });

  const contentTypes = await releaseActionService.getContentTypeModelsFromActions(results);

  const tree = await strapi
    .plugin('content-releases')
    .service('release')
    .buildReleaseTree(results, contentTypes);

  return tree;
};
