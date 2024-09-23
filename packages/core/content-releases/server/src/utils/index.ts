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
    return strapi.documents(contentType).findOne({ documentId, locale, populate, status });
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
