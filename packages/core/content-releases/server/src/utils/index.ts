import type { UID, Data, Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import type { SettingsService } from '../services/settings';

type Services = {
  release: any;
  'release-validation': any;
  scheduling: any;
  'release-action': any;
  'event-manager': any;
  settings: SettingsService;
};

export const getService = <TName extends keyof Services>(
  name: TName,
  { strapi }: { strapi: Core.Strapi }
): Services[TName] => {
  return strapi.plugin('content-releases').service(name);
};

export const getPopulatedEntry = async (
  contentTypeUid: string,
  entryId: Data.ID,
  { strapi }: { strapi: Core.Strapi }
) => {
  const populateBuilderService = strapi.plugin('content-manager').service('populate-builder');
  // @ts-expect-error - populateBuilderService should be a function but is returning service
  const populate = await populateBuilderService(contentTypeUid).populateDeep(Infinity).build();

  const entry = await strapi.db.query(contentTypeUid).findOne({
    where: { id: entryId },
    populate,
  });

  return entry;
};

export const getEntryValidStatus = async (
  contentTypeUid: string,
  entry: { id: Data.ID; [key: string]: any },
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

/**
 * Temporal function to get the entryId from documentId with locale
 * This is needed because some services still need the entryId to work
 */
export const getEntryId = async (
  {
    contentTypeUid,
    documentId,
    locale,
  }: { contentTypeUid: UID.ContentType; documentId?: string; locale?: string },
  { strapi }: { strapi: Core.Strapi }
) => {
  let document;

  if (documentId) {
    document = await strapi.documents(contentTypeUid).findOne({ documentId, locale });
  } else {
    // documentId is not defined in singleTypes, so we want to get the first document
    document = await strapi.documents(contentTypeUid).findFirst({ locale });
  }

  if (!document) {
    throw new errors.NotFoundError(
      `Entry not found on Content Releases for contentTypeUid ${contentTypeUid} and documentId ${documentId}`
    );
  }

  return document.id;
};
