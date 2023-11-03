import { omit } from 'lodash/fp';
import strapiUtils from '@strapi/utils';
import { mapAsync } from '@strapi/utils';
import { errors } from '@strapi/utils';
const { ApplicationError } = errors;
import { getService } from '../utils';
import { getDeepPopulate, getDeepPopulateDraftCount } from './utils/populate';
import { getDeepRelationsCount } from './utils/count';
import { sumDraftCounts } from './utils/draft';
import { isWebhooksPopulateRelationsEnabled } from './utils/populate';
import { ALLOWED_WEBHOOK_EVENTS } from '../constants';

const { ENTRY_PUBLISH, ENTRY_UNPUBLISH } = ALLOWED_WEBHOOK_EVENTS;

const { hasDraftAndPublish } = strapiUtils.contentTypes;
const { PUBLISHED_AT_ATTRIBUTE } = strapiUtils.contentTypes.constants;

const omitPublishedAtField = omit(PUBLISHED_AT_ATTRIBUTE);

const emitEvent = async (uid: any, event: any, entity: any) => {
  const modelDef = strapi.getModel(uid);
  const sanitizedEntity = await strapiUtils.sanitize.sanitizers.defaultSanitizeOutput(
    modelDef,
    entity
  );

  strapi.eventHub.emit(event, {
    model: modelDef.modelName,
    entry: sanitizedEntity,
  });
};

const buildDeepPopulate = (uid: string) => {
  // User can configure to populate relations, so downstream services can use them.
  // They will be transformed into counts later if this is set to true.

  return (
    // @ts-ignore TODO
    getService('populate-builder')(uid)
      .populateDeep(Infinity)
      // TODO does isWebhooksPopulateRelationsEnabled need a param
      .countRelationsIf(!isWebhooksPopulateRelationsEnabled())
      .build()
  );
};

/**
 * @type {import('./entity-manager').default}
 */
export default ({ strapi }: any) => ({
  /**
   * Extend this function from other plugins to add custom mapping of entity
   * responses
   * @param {Object} entity
   * @returns
   */
  mapEntity(entity: any) {
    return entity;
  },

  /**
   * Some entity manager functions may return multiple entities or one entity.
   * This function maps the response in both cases
   * @param {Array|Object|null} entities
   * @param {string} uid
   */
  async mapEntitiesResponse(entities: any, uid: any) {
    if (entities?.results) {
      const mappedResults = await mapAsync(entities.results, (entity: any) =>
        //@ts-ignore TODO
        this.mapEntity(entity, uid)
      );
      return { ...entities, results: mappedResults };
    }
    // if entity is single type
    //@ts-ignore TODO
    return this.mapEntity(entities, uid);
  },

  async find(opts: any, uid: any) {
    const params = { ...opts, populate: getDeepPopulate(uid) };
    const entities = await strapi.entityService.findMany(uid, params);
    return this.mapEntitiesResponse(entities, uid);
  },

  async findPage(opts: any, uid: any) {
    const entities = await strapi.entityService.findPage(uid, opts);
    return this.mapEntitiesResponse(entities, uid);
  },

  async findOne(id: any, uid: any, opts = {}) {
    return (
      strapi.entityService
        .findOne(uid, id, opts)
        //@ts-ignore TODO
        .then((entity: any) => this.mapEntity(entity, uid))
    );
  },

  async create(body: any, uid: any) {
    const modelDef = strapi.getModel(uid);
    const publishData = { ...body };
    const populate = await buildDeepPopulate(uid);

    if (hasDraftAndPublish(modelDef)) {
      publishData[PUBLISHED_AT_ATTRIBUTE] = null;
    }

    const params = { data: publishData, populate };

    const entity = await strapi.entityService
      .create(uid, params)
      //@ts-ignore TODO
      .then((entity: any) => this.mapEntity(entity, uid));

    //@ts-ignore TODO
    if (isWebhooksPopulateRelationsEnabled(uid)) {
      return getDeepRelationsCount(entity, uid);
    }

    return entity;
  },

  async update(entity: any, body: any, uid: any) {
    const publishData = omitPublishedAtField(body);
    const populate = await buildDeepPopulate(uid);
    const params = { data: publishData, populate };

    const updatedEntity = await strapi.entityService
      .update(uid, entity.id, params)
      //@ts-ignore TODO
      .then((entity: any) => this.mapEntity(entity, uid));

    //@ts-ignore TODO
    if (isWebhooksPopulateRelationsEnabled(uid)) {
      return getDeepRelationsCount(updatedEntity, uid);
    }

    return updatedEntity;
  },
  async clone(entity: any, body: any, uid: any) {
    const modelDef = strapi.getModel(uid);
    const populate = await buildDeepPopulate(uid);
    const publishData = { ...body };

    if (hasDraftAndPublish(modelDef)) {
      publishData[PUBLISHED_AT_ATTRIBUTE] = null;
    }

    const params = {
      data: publishData,
      populate,
    };

    const clonedEntity = await strapi.entityService.clone(uid, entity.id, params);

    // If relations were populated, relations count will be returned instead of the array of relations.
    //@ts-ignore TODO
    if (isWebhooksPopulateRelationsEnabled(uid)) {
      return getDeepRelationsCount(clonedEntity, uid);
    }

    return clonedEntity;
  },
  async delete(entity: any, uid: any) {
    const populate = await buildDeepPopulate(uid);
    const deletedEntity = await strapi.entityService.delete(uid, entity.id, { populate });

    // If relations were populated, relations count will be returned instead of the array of relations.
    //@ts-ignore TODO
    if (isWebhooksPopulateRelationsEnabled(uid)) {
      return getDeepRelationsCount(deletedEntity, uid);
    }

    return deletedEntity;
  },

  // FIXME: handle relations
  deleteMany(opts: any, uid: any) {
    return strapi.entityService.deleteMany(uid, opts);
  },

  async publish(entity: any, uid: any, body = {}) {
    if (entity[PUBLISHED_AT_ATTRIBUTE]) {
      throw new ApplicationError('already.published');
    }

    // validate the entity is valid for publication
    await strapi.entityValidator.validateEntityCreation(
      strapi.getModel(uid),
      entity,
      undefined,
      entity
    );

    const data = { ...body, [PUBLISHED_AT_ATTRIBUTE]: new Date() };
    const populate = await buildDeepPopulate(uid);

    const params = { data, populate };

    const updatedEntity = await strapi.entityService.update(uid, entity.id, params);

    await emitEvent(uid, ENTRY_PUBLISH, updatedEntity);

    //@ts-ignore TODO

    const mappedEntity = await this.mapEntity(updatedEntity, uid);

    // If relations were populated, relations count will be returned instead of the array of relations.
    //@ts-ignore TODO
    if (isWebhooksPopulateRelationsEnabled(uid)) {
      return getDeepRelationsCount(mappedEntity, uid);
    }

    return mappedEntity;
  },

  async publishMany(entities: any, uid: any) {
    if (!entities.length) {
      return null;
    }

    // Validate entities before publishing, throw if invalid
    await Promise.all(
      entities.map((entity: any) => {
        return strapi.entityValidator.validateEntityCreation(
          strapi.getModel(uid),
          entity,
          undefined,
          entity
        );
      })
    );

    // Only publish entities without a published_at date
    const entitiesToPublish = entities
      .filter((entity: any) => !entity[PUBLISHED_AT_ATTRIBUTE])
      .map((entity: any) => entity.id);

    const filters = { id: { $in: entitiesToPublish } };
    const data = { [PUBLISHED_AT_ATTRIBUTE]: new Date() };
    const populate = await buildDeepPopulate(uid);

    // Everything is valid, publish
    const publishedEntitiesCount = await strapi.db.query(uid).updateMany({
      where: filters,
      data,
    });
    // Get the updated entities since updateMany only returns the count
    const publishedEntities = await strapi.entityService.findMany(uid, { filters, populate });
    // Emit the publish event for all updated entities
    await Promise.all(
      publishedEntities.map((entity: any) => emitEvent(uid, ENTRY_PUBLISH, entity))
    );

    // Return the number of published entities
    return publishedEntitiesCount;
  },

  async unpublishMany(entities: any, uid: any) {
    if (!entities.length) {
      return null;
    }

    // Only unpublish entities with a published_at date
    const entitiesToUnpublish = entities
      .filter((entity: any) => entity[PUBLISHED_AT_ATTRIBUTE])
      .map((entity: any) => entity.id);

    const filters = { id: { $in: entitiesToUnpublish } };
    const data = { [PUBLISHED_AT_ATTRIBUTE]: null };
    const populate = await buildDeepPopulate(uid);

    // No need to validate, unpublish
    const unpublishedEntitiesCount = await strapi.db.query(uid).updateMany({
      where: filters,
      data,
    });
    // Get the updated entities since updateMany only returns the count
    const unpublishedEntities = await strapi.entityService.findMany(uid, { filters, populate });
    // Emit the unpublish event for all updated entities
    await Promise.all(
      unpublishedEntities.map((entity: any) => emitEvent(uid, ENTRY_UNPUBLISH, entity))
    );

    // Return the number of unpublished entities
    return unpublishedEntitiesCount;
  },

  async unpublish(entity: any, uid: any, body = {}) {
    if (!entity[PUBLISHED_AT_ATTRIBUTE]) {
      throw new ApplicationError('already.draft');
    }

    const data = { ...body, [PUBLISHED_AT_ATTRIBUTE]: null };
    const populate = await buildDeepPopulate(uid);

    const params = { data, populate };

    const updatedEntity = await strapi.entityService.update(uid, entity.id, params);

    await emitEvent(uid, ENTRY_UNPUBLISH, updatedEntity);

    //@ts-ignore TODO

    const mappedEntity = await this.mapEntity(updatedEntity, uid);

    // If relations were populated, relations count will be returned instead of the array of relations.
    //@ts-ignore TODO
    if (isWebhooksPopulateRelationsEnabled(uid)) {
      return getDeepRelationsCount(mappedEntity, uid);
    }

    return mappedEntity;
  },

  async countDraftRelations(id: any, uid: any) {
    const { populate, hasRelations } = getDeepPopulateDraftCount(uid);

    if (!hasRelations) {
      return 0;
    }

    const entity = await strapi.entityService.findOne(uid, id, { populate });

    return sumDraftCounts(entity, uid);
  },

  async countManyEntriesDraftRelations(ids: any, uid: any, locale = 'en') {
    const { populate, hasRelations } = getDeepPopulateDraftCount(uid);

    if (!hasRelations) {
      return 0;
    }

    const entities = await strapi.entityService.findMany(uid, {
      populate,
      filters: { id: { $in: ids } },
      locale,
    });

    const totalNumberDraftRelations = entities.reduce(
      (count: any, entity: any) => sumDraftCounts(entity, uid) + count,
      0
    );

    return totalNumberDraftRelations;
  },
});
