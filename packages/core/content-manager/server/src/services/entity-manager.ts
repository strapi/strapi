import { omit } from 'lodash/fp';
import { mapAsync, errors, contentTypes, sanitize } from '@strapi/utils';
import type { LoadedStrapi as Strapi, Common, EntityService } from '@strapi/types';
import { getService } from '../utils';
import {
  getDeepPopulate,
  getDeepPopulateDraftCount,
  isWebhooksPopulateRelationsEnabled,
} from './utils/populate';
import { getDeepRelationsCount } from './utils/count';
import { sumDraftCounts } from './utils/draft';
import { ALLOWED_WEBHOOK_EVENTS } from '../constants';

const { ApplicationError } = errors;
const { ENTRY_PUBLISH, ENTRY_UNPUBLISH } = ALLOWED_WEBHOOK_EVENTS;

const { hasDraftAndPublish } = contentTypes;
const { PUBLISHED_AT_ATTRIBUTE } = contentTypes.constants;

const omitPublishedAtField = omit(PUBLISHED_AT_ATTRIBUTE);

// Types reused from entity service
export type Entity = EntityService.Result<Common.UID.ContentType>;
type Body = EntityService.Params.Data.Input<Common.UID.ContentType>;

const emitEvent = async (uid: Common.UID.ContentType, event: string, entity: Entity) => {
  const modelDef = strapi.getModel(uid);
  const sanitizedEntity = await sanitize.sanitizers.defaultSanitizeOutput(modelDef, entity);

  strapi.eventHub.emit(event, {
    model: modelDef.modelName,
    entry: sanitizedEntity,
  });
};

const buildDeepPopulate = (uid: Common.UID.ContentType) => {
  // User can configure to populate relations, so downstream services can use them.
  // They will be transformed into counts later if this is set to true.

  return (
    // @ts-expect-error populate builder needs to be called with a UID
    getService('populate-builder')(uid)
      .populateDeep(Infinity)
      .countRelationsIf(!isWebhooksPopulateRelationsEnabled())
      .build()
  );
};

type EntityManager = (opts: { strapi: Strapi }) => {
  mapEntity<T = unknown>(entity: T): T;
  mapEntitiesResponse(entities: any, uid: Common.UID.ContentType): any;
  find(
    opts: Parameters<typeof strapi.entityService.findMany>[1],
    uid: Common.UID.ContentType
  ): Promise<ReturnType<typeof strapi.entityService.findMany>>;
  findPage(
    opts: Parameters<typeof strapi.entityService.findPage>[1],
    uid: Common.UID.ContentType
  ): Promise<ReturnType<typeof strapi.entityService.findPage>>;
  findOne(id: Entity['id'], uid: Common.UID.ContentType, opts?: any): Promise<Entity>;
  create(body: Body, uid: Common.UID.ContentType): Promise<Entity>;
  update(entity: Entity, body: Partial<Body>, uid: Common.UID.ContentType): Promise<Entity | null>;
  clone(entity: Entity, body: Partial<Body>, uid: Common.UID.ContentType): Promise<Entity | null>;
  delete(entity: Entity, uid: Common.UID.ContentType): Promise<Entity | null>;
  deleteMany(
    opts: Parameters<typeof strapi.entityService.deleteMany>[1],
    uid: Common.UID.ContentType
  ): Promise<{ count: number } | null>;
  publish(entity: Entity, uid: Common.UID.ContentType, body?: any): Promise<Entity | null>;
  publishMany(entities: Entity[], uid: Common.UID.ContentType): Promise<{ count: number } | null>;
  unpublish(entity: Entity, uid: Common.UID.ContentType, body?: any): Promise<Entity | null>;
  unpublishMany(entities: Entity[], uid: Common.UID.ContentType): Promise<{ count: number } | null>;
  countDraftRelations(id: Entity['id'], uid: Common.UID.ContentType): Promise<number>;
  countManyEntriesDraftRelations(
    ids: number[],
    uid: Common.UID.ContentType,
    locale?: string
  ): Promise<number>;
};

const entityManager: EntityManager = ({ strapi }) => ({
  /**
   * Extend this function from other plugins to add custom mapping of entity
   * responses
   * @param {Object} entity
   * @returns
   */
  mapEntity<T = unknown>(entity: T): T {
    return entity;
  },

  /**
   * Some entity manager functions may return multiple entities or one entity.
   * This function maps the response in both cases
   * @param {Array|Object|null} entities
   * @param {string} uid
   */
  async mapEntitiesResponse(entities: any, uid: Common.UID.ContentType) {
    if (entities?.results) {
      const mappedResults = await mapAsync(entities.results, (entity: Entity) =>
        // @ts-expect-error mapEntity can be extended
        this.mapEntity(entity, uid)
      );
      return { ...entities, results: mappedResults };
    }
    // if entity is single type
    // @ts-expect-error mapEntity can be extended
    return this.mapEntity(entities, uid);
  },

  async find(
    opts: Parameters<typeof strapi.entityService.findMany>[1],
    uid: Common.UID.ContentType
  ) {
    const params = { ...opts, populate: getDeepPopulate(uid) } as typeof opts;
    const entities = await strapi.entityService.findMany(uid, params);
    return this.mapEntitiesResponse(entities, uid);
  },

  async findPage(
    opts: Parameters<typeof strapi.entityService.findPage>[1],
    uid: Common.UID.ContentType
  ) {
    const entities = await strapi.entityService.findPage(uid, opts);
    return this.mapEntitiesResponse(entities, uid);
  },

  async findOne(id: Entity['id'], uid: Common.UID.ContentType, opts = {}) {
    return (
      strapi.entityService
        .findOne(uid, id, opts)
        // @ts-expect-error mapEntity can be extended
        .then((entity: Entity) => this.mapEntity(entity, uid))
    );
  },

  async create(body: Body, uid: Common.UID.ContentType) {
    const modelDef = strapi.getModel(uid);
    const publishData = { ...body } as any;
    const populate = await buildDeepPopulate(uid);

    if (hasDraftAndPublish(modelDef)) {
      publishData[PUBLISHED_AT_ATTRIBUTE] = null;
    }

    const params = { data: publishData, populate };

    const entity = await strapi.entityService
      .create(uid, params)
      // @ts-expect-error mapEntity can be extended
      .then((entity: Entity) => this.mapEntity(entity, uid));

    if (isWebhooksPopulateRelationsEnabled()) {
      return getDeepRelationsCount(entity, uid);
    }

    return entity;
  },

  async update(entity: Entity, body: Partial<Body>, uid: Common.UID.ContentType) {
    const publishData = omitPublishedAtField(body);
    const populate = await buildDeepPopulate(uid);
    const params = { data: publishData, populate };

    const updatedEntity = await strapi.entityService
      .update(uid, entity.id, params)
      // @ts-expect-error mapEntity can be extended
      .then((entity: Entity) => this.mapEntity(entity, uid));

    if (isWebhooksPopulateRelationsEnabled()) {
      return getDeepRelationsCount(updatedEntity, uid);
    }

    return updatedEntity;
  },
  async clone(entity: Entity, body: Partial<Body>, uid: Common.UID.ContentType) {
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
    if (clonedEntity && isWebhooksPopulateRelationsEnabled()) {
      return getDeepRelationsCount(clonedEntity, uid);
    }

    return clonedEntity;
  },
  async delete(entity: Entity, uid: Common.UID.ContentType) {
    const populate = await buildDeepPopulate(uid);
    const deletedEntity = await strapi.entityService.delete(uid, entity.id, { populate });

    // If relations were populated, relations count will be returned instead of the array of relations.
    if (deletedEntity && isWebhooksPopulateRelationsEnabled()) {
      return getDeepRelationsCount(deletedEntity, uid);
    }

    return deletedEntity;
  },

  // FIXME: handle relations
  deleteMany(
    opts: Parameters<typeof strapi.entityService.deleteMany>[1],
    uid: Common.UID.ContentType
  ) {
    return strapi.entityService.deleteMany(uid, opts);
  },

  async publish(entity: Entity, uid: Common.UID.ContentType, body = {}) {
    if (entity[PUBLISHED_AT_ATTRIBUTE]) {
      throw new ApplicationError('already.published');
    }

    // validate the entity is valid for publication
    await strapi.entityValidator.validateEntityCreation(
      strapi.getModel(uid),
      entity,
      undefined,
      // @ts-expect-error - FIXME: entity here is unnecessary
      entity
    );

    const data = { ...body, [PUBLISHED_AT_ATTRIBUTE]: new Date() };
    const populate = await buildDeepPopulate(uid);

    const params = { data, populate };

    const updatedEntity = await strapi.entityService.update(uid, entity.id, params);

    await emitEvent(uid, ENTRY_PUBLISH, updatedEntity!);

    // @ts-expect-error mapEntity can be extended
    const mappedEntity = await this.mapEntity(updatedEntity, uid);

    // If relations were populated, relations count will be returned instead of the array of relations.
    if (mappedEntity && isWebhooksPopulateRelationsEnabled()) {
      return getDeepRelationsCount(mappedEntity, uid);
    }

    return mappedEntity;
  },

  async publishMany(entities: Entity[], uid: Common.UID.ContentType) {
    if (!entities.length) {
      return null;
    }

    // Validate entities before publishing, throw if invalid
    await Promise.all(
      entities.map((entity: Entity) => {
        return strapi.entityValidator.validateEntityCreation(
          strapi.getModel(uid),
          entity,
          undefined,
          // @ts-expect-error - FIXME: entity here is unnecessary
          entity
        );
      })
    );

    // Only publish entities without a published_at date
    const entitiesToPublish = entities
      .filter((entity: Entity) => !entity[PUBLISHED_AT_ATTRIBUTE])
      .map((entity: Entity) => entity.id);

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
      publishedEntities!.map((entity: Entity) => emitEvent(uid, ENTRY_PUBLISH, entity))
    );

    // Return the number of published entities
    return publishedEntitiesCount;
  },

  async unpublishMany(entities: Entity[], uid: Common.UID.ContentType) {
    if (!entities.length) {
      return null;
    }

    // Only unpublish entities with a published_at date
    const entitiesToUnpublish = entities
      .filter((entity: Entity) => entity[PUBLISHED_AT_ATTRIBUTE])
      .map((entity: Entity) => entity.id);

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
      unpublishedEntities!.map((entity: Entity) => emitEvent(uid, ENTRY_UNPUBLISH, entity))
    );

    // Return the number of unpublished entities
    return unpublishedEntitiesCount;
  },

  async unpublish(entity: Entity, uid: Common.UID.ContentType, body = {}) {
    if (!entity[PUBLISHED_AT_ATTRIBUTE]) {
      throw new ApplicationError('already.draft');
    }

    const data = { ...body, [PUBLISHED_AT_ATTRIBUTE]: null };
    const populate = await buildDeepPopulate(uid);

    const params = { data, populate };

    const updatedEntity = await strapi.entityService.update(uid, entity.id, params);

    await emitEvent(uid, ENTRY_UNPUBLISH, updatedEntity!);

    // @ts-expect-error mapEntity can be extended
    const mappedEntity = await this.mapEntity(updatedEntity, uid);

    // If relations were populated, relations count will be returned instead of the array of relations.
    if (mappedEntity && isWebhooksPopulateRelationsEnabled()) {
      return getDeepRelationsCount(mappedEntity, uid);
    }

    return mappedEntity;
  },

  async countDraftRelations(id: Entity['id'], uid: Common.UID.ContentType) {
    const { populate, hasRelations } = getDeepPopulateDraftCount(uid);

    if (!hasRelations) {
      return 0;
    }

    const entity = await strapi.entityService.findOne(uid, id, { populate });

    return sumDraftCounts(entity, uid);
  },

  async countManyEntriesDraftRelations(
    ids: number[],
    uid: Common.UID.ContentType,
    locale: string = 'en'
  ) {
    const { populate, hasRelations } = getDeepPopulateDraftCount(uid);

    if (!hasRelations) {
      return 0;
    }

    const entities = await strapi.entityService.findMany(uid, {
      populate,
      filters: { id: { $in: ids } },
      locale,
    });

    const totalNumberDraftRelations: number = entities!.reduce(
      (count: number, entity: Entity) => sumDraftCounts(entity, uid) + count,
      0
    );

    return totalNumberDraftRelations;
  },
});

export default entityManager;
export type { EntityManager };
