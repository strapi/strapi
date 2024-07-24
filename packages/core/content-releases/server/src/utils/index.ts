import type { Common, Entity } from '@strapi/types';

export const getService = (
  name: 'release' | 'release-validation' | 'scheduling' | 'release-action' | 'event-manager',
  { strapi } = { strapi: global.strapi }
) => {
  return strapi.plugin('content-releases').service(name);
};

export const getPopulatedEntry = async (
  contentTypeUid: Common.UID.ContentType,
  entryId: Entity.ID,
  { strapi } = { strapi: global.strapi }
) => {
  const populateBuilderService = strapi.plugin('content-manager').service('populate-builder');
  // @ts-expect-error - populateBuilderService should be a function but is returning service
  const populate = await populateBuilderService(contentTypeUid).populateDeep(Infinity).build();

  const entry = await strapi.entityService.findOne(contentTypeUid, entryId, { populate });

  return entry;
};

export const getEntryValidStatus = async (
  contentTypeUid: Common.UID.ContentType,
  entry: { id: Entity.ID; [key: string]: any },
  { strapi } = { strapi: global.strapi }
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
