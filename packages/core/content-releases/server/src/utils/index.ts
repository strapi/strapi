import type { UID, Data, Core } from '@strapi/types';

export const getService = (
  name: 'release' | 'release-validation' | 'scheduling' | 'release-action' | 'event-manager',
  { strapi }: { strapi: Core.Strapi }
) => {
  return strapi.plugin('content-releases').service(name);
};

export const getPopulatedEntry = async (
  contentTypeUid: UID.ContentType,
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
  contentTypeUid: UID.ContentType,
  entry: { id: Data.ID; [key: string]: any },
  { strapi }: { strapi: Core.Strapi }
) => {
  try {
    // Same function used by entity-manager to validate entries before publishing
    await strapi.entityValidator.validateEntityCreation(
      strapi.getModel(contentTypeUid),
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
