import { contentTypes as contentTypesUtils } from '@strapi/utils';

import type { UID, Data, Core } from '@strapi/types';

import type { SettingsService } from '../services/settings';
import type { ReleaseService } from '../services/release';
import type { ReleaseActionService } from '../services/release-action';

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
  }: Action & { status?: 'draft' | 'published'; populate: any },
  { strapi }: { strapi: Core.Strapi }
) => {
  if (documentId) {
    // Try to get an existing draft or published document
    const entry = await strapi
      .documents(contentType)
      .findOne({ documentId, locale, populate, status });

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

export const getEntryStatus = async (contentType: UID.ContentType, entry: Data.ContentType) => {
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

/**
 * Recursively collects content type UIDs that a model (content type or component) has relations to.
 * Go through component and dynamic zone attributes to find nested relations.
 */
const collectRelationTargets = (
  modelUid: string,
  strapi: Core.Strapi,
  visited = new Set<string>()
): Set<string> => {
  const targets = new Set<string>();
  if (visited.has(modelUid)) {
    return targets;
  }
  visited.add(modelUid);

  const model = strapi.getModel(modelUid as UID.Schema);
  if (!model?.attributes) {
    return targets;
  }

  for (const attribute of Object.values(model.attributes) as Array<{
    type?: string;
    target?: string;
    component?: string;
    components?: string[];
  }>) {
    if (attribute?.type === 'relation' && attribute.target) {
      targets.add(attribute.target);
    }
    if (attribute?.type === 'component' && attribute.component) {
      for (const t of collectRelationTargets(attribute.component, strapi, visited)) {
        targets.add(t);
      }
    }
    if (attribute?.type === 'dynamiczone' && attribute.components) {
      for (const compUid of attribute.components) {
        for (const t of collectRelationTargets(compUid, strapi, visited)) {
          targets.add(t);
        }
      }
    }
  }
  return targets;
};

/**
 * Returns content type UIDs sorted by relation dependency order for publishing.
 * When content type A has a relation to content type B (both with draft & publish),
 * B will appear before A in the result. This ensures that when publishing a release,
 * related entities are published first, so that relation IDs can be correctly
 * resolved (published target must exist when publishing source).
 *
 * Relations in components (nested or not) and dynamic zones are also considered.
 *
 * @param contentTypeUids - Content type UIDs that will be published in the release
 * @param strapi - Strapi instance
 * @returns Content type UIDs in publish order (dependencies first)
 */
export const getPublishOrderForContentTypes = (
  contentTypeUids: UID.ContentType[],
  { strapi }: { strapi: Core.Strapi }
): UID.ContentType[] => {
  const uidSet = new Set(contentTypeUids);

  // Build dependency graph: source depends on target (source must be published after target)
  const dependencies = new Map<UID.ContentType, Set<UID.ContentType>>();

  for (const uid of contentTypeUids) {
    const model = strapi.getModel(uid);
    if (model && contentTypesUtils.hasDraftAndPublish(model)) {
      const relationTargets = collectRelationTargets(uid, strapi);

      for (const targetUid of relationTargets) {
        const targetContentTypeUid = targetUid as UID.ContentType;
        const isTargetInRelease =
          uidSet.has(targetContentTypeUid) && targetContentTypeUid in strapi.contentTypes;
        const targetModel = strapi.getModel(targetContentTypeUid);
        const targetHasDraftAndPublish =
          targetModel && contentTypesUtils.hasDraftAndPublish(targetModel);

        if (isTargetInRelease && targetHasDraftAndPublish) {
          let dependencySet = dependencies.get(uid);
          if (!dependencySet) {
            dependencySet = new Set();
            dependencies.set(uid, dependencySet);
          }
          dependencySet.add(targetContentTypeUid);
        }
      }
    }
  }

  // Topological sort: dependencies first
  const sorted: UID.ContentType[] = [];
  const visited = new Set<UID.ContentType>();
  const visiting = new Set<UID.ContentType>();

  const visit = (uid: UID.ContentType) => {
    if (visited.has(uid)) return;
    if (visiting.has(uid)) return; // No cycle in valid schemas

    visiting.add(uid);
    for (const dep of dependencies.get(uid) ?? []) {
      visit(dep);
    }
    visiting.delete(uid);
    visited.add(uid);
    sorted.push(uid);
  };

  for (const uid of contentTypeUids) {
    visit(uid);
  }

  return sorted;
};
