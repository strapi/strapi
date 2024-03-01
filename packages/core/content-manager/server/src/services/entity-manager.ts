import type { Public, Core, Modules } from '@strapi/types';

import { omit } from 'lodash/fp';
import { mapAsync, contentTypes, sanitize, errors } from '@strapi/utils';
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

const { PUBLISHED_AT_ATTRIBUTE } = contentTypes.constants;

const omitPublishedAtField = omit(PUBLISHED_AT_ATTRIBUTE);

// Types reused from entity service
export type Entity = Modules.EntityService.Result<Public.UID.ContentType>;
type Body = Modules.EntityService.Params.Data.Input<Public.UID.ContentType>;

const emitEvent = async (uid: Public.UID.ContentType, event: string, entity: Entity) => {
  const modelDef = strapi.getModel(uid);
  const sanitizedEntity = await sanitize.sanitizers.defaultSanitizeOutput(modelDef, entity);

  strapi.eventHub.emit(event, {
    model: modelDef.modelName,
    entry: sanitizedEntity,
  });
};

const buildDeepPopulate = (uid: Public.UID.ContentType) => {
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

const entityManager = ({ strapi }: { strapi: Core.LoadedStrapi }) => ({
  /**
   * Extend this function from other plugins to add custom mapping of entity
   * responses
   * @param {Object} entity
   * @returns
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mapEntity<T = any>(entity: any, uid?: Public.UID.ContentType): T {
    return entity;
  },

  /**
   * Some entity manager functions may return multiple entities or one entity.
   * This function maps the response in both cases
   * @param {Array|Object|null} entities
   * @param {string} uid
   */
  async mapEntitiesResponse(entities: any, uid: Public.UID.ContentType) {
    if (entities?.results) {
      const mappedResults = await mapAsync(entities.results, (entity: Entity) =>
        this.mapEntity(entity, uid)
      );
      return { ...entities, results: mappedResults };
    }
    // if entity is single type
    return this.mapEntity(entities, uid);
  },

  async find(
    opts: Parameters<Modules.Documents.ServiceInstance['findMany']>[0],
    uid: Public.UID.ContentType
  ) {
    const params = { ...opts, populate: getDeepPopulate(uid) } as typeof opts;
    const entities = await strapi.documents(uid).findMany(params);
    return this.mapEntitiesResponse(entities, uid);
  },

  async findPage(
    opts: Parameters<Modules.Documents.ServiceInstance['findMany']>[0],
    uid: Public.UID.ContentType
  ) {
    // Pagination
    const page = Number(opts?.page) || 1;
    const pageSize = Number(opts?.pageSize) || 10;

    const [documents, total = 0] = await Promise.all([
      strapi.documents(uid).findMany(opts),
      strapi.documents(uid).count(opts),
    ]);

    const result = {
      results: documents,
      pagination: {
        page,
        pageSize,
        pageCount: Math.ceil(total! / pageSize),
        total,
      },
    };

    return this.mapEntitiesResponse(result, uid);
  },

  async findOne(id: string, uid: Public.UID.ContentType, opts = {}) {
    return (
      strapi
        .documents(uid)
        .findOne(id, opts)
        // @ts-expect-error mapEntity can be extended
        .then((entity: Entity) => this.mapEntity(entity, uid))
    );
  },

  async create(
    uid: Public.UID.ContentType,
    opts: Parameters<Modules.Documents.ServiceInstance['create']>[0] = {} as any
  ) {
    const populate = opts.populate ?? (await buildDeepPopulate(uid));
    const params = { ...opts, status: 'draft', populate };

    const document = await strapi
      .documents(uid)
      .create(params)
      .then((entity: Entity) => this.mapEntity(entity, uid));

    // if (isWebhooksPopulateRelationsEnabled()) {
    //   return getDeepRelationsCount(document, uid);
    // }

    return document;
  },

  async update(
    document: Entity,
    uid: Public.UID.ContentType,
    opts: Parameters<Modules.Documents.ServiceInstance['update']>[1] = {} as any
  ) {
    const publishData = omitPublishedAtField(opts.data || {});
    const populate = opts.populate ?? (await buildDeepPopulate(uid));

    // TODO: Remove this once we change documentId to id in database
    delete publishData.id;
    const params = { ...opts, data: publishData, populate, status: 'draft' };

    const updatedDocument = await strapi
      .documents(uid)
      // @ts-expect-error - change entity to document
      .update(document.id, params)
      // @ts-expect-error mapEntity can be extended
      .then((document: Entity) => this.mapEntity(document, uid));

    // if (isWebhooksPopulateRelationsEnabled()) {
    //   return getDeepRelationsCount(updatedDocument, uid);
    // }

    return updatedDocument;
  },

  async clone(document: Entity, body: Partial<Body>, uid: Public.UID.ContentType) {
    const populate = await buildDeepPopulate(uid);
    const publishData = { ...body };

    publishData[PUBLISHED_AT_ATTRIBUTE] = null;

    // TODO: Remove this once we change documentId to id in database
    delete publishData.id;

    const params = {
      data: publishData,
      populate,
    };

    // @ts-expect-error - change entity to document
    const result = await strapi.documents(uid).clone(document.id, params);

    const clonedEntity = result?.versions.at(0);
    // If relations were populated, relations count will be returned instead of the array of relations.
    if (clonedEntity && isWebhooksPopulateRelationsEnabled()) {
      return getDeepRelationsCount(clonedEntity, uid);
    }

    return clonedEntity;
  },

  /**
   *  Check if a document exists
   */
  async exists(uid: Public.UID.ContentType, id?: string) {
    // Collection type
    if (id) {
      const count = await strapi.db.query(uid).count({ where: { documentId: id } });
      return count > 0;
    }

    // Single type
    const count = await strapi.db.query(uid).count();
    return count > 0;
  },

  async delete(
    document: Entity,
    uid: Public.UID.ContentType,
    opts: Parameters<Modules.Documents.ServiceInstance['delete']>[1] = {} as any
  ) {
    const populate = await buildDeepPopulate(uid);

    // @ts-expect-error - change entity to document
    await strapi.documents(uid).delete(document.id, { ...opts, populate });
    // const deletedDocument = await strapi.documents(uid).delete(document.id, { ...opts, populate });

    // If relations were populated, relations count will be returned instead of the array of relations.
    // if (deletedDocument && isWebhooksPopulateRelationsEnabled()) {
    //   return getDeepRelationsCount(deletedEntity, uid);
    // }

    // TODO: Return all deleted versions?
    return {};
  },

  // FIXME: handle relations
  deleteMany(
    opts: Parameters<typeof strapi.entityService.deleteMany>[1],
    uid: Public.UID.ContentType
  ) {
    return strapi.entityService.deleteMany(uid, opts);
  },

  async publish(
    document: Entity,
    uid: Public.UID.ContentType,
    opts: Parameters<Modules.Documents.ServiceInstance['publish']>[1] = {} as any
  ) {
    const populate = await buildDeepPopulate(uid);
    const params = { ...opts, populate };

    const { versions: publishedDocuments } = await strapi
      .documents(uid)
      // @ts-expect-error - Change entity to document
      .publish(document.id, params);

    // TODO: What if we publish many versions at once?
    const publishedDocument = publishedDocuments.at(0);
    const mappedEntity = await this.mapEntity(publishedDocument, uid);

    // If relations were populated, relations count will be returned instead of the array of relations.
    if (mappedEntity && isWebhooksPopulateRelationsEnabled()) {
      return getDeepRelationsCount(mappedEntity, uid);
    }

    return mappedEntity;
  },

  async publishMany(entities: Entity[], uid: Public.UID.ContentType) {
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

  async unpublishMany(entities: Entity[], uid: Public.UID.ContentType) {
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

  async unpublish(
    document: Entity,
    uid: Public.UID.ContentType,
    opts: Parameters<Modules.Documents.ServiceInstance['unpublish']>[1] = {} as any
  ) {
    const populate = await buildDeepPopulate(uid);
    const params = { ...opts, populate };

    const { versions: unpublishedDocuments } = await strapi
      .documents(uid)
      // @ts-expect-error - Change entity to document
      .unpublish(document.id, params);

    // TODO: What if we publish many versions at once?
    const unpublishedDocument = unpublishedDocuments.at(0);
    const mappedEntity = await this.mapEntity(unpublishedDocument, uid);

    // If relations were populated, relations count will be returned instead of the array of relations.
    if (mappedEntity && isWebhooksPopulateRelationsEnabled()) {
      return getDeepRelationsCount(mappedEntity, uid);
    }

    return mappedEntity;
  },

  async discard(
    document: Entity,
    uid: Public.UID.ContentType,
    opts: Parameters<Modules.Documents.ServiceInstance['discardDraft']>[1] = {} as any
  ) {
    const populate = await buildDeepPopulate(uid);
    const params = { ...opts, populate };

    const { versions: discardedDocuments } = await strapi.documents(uid).discardDraft(
      // @ts-expect-error - Change entity to document
      document.id,
      params
    );

    // We only discard one document at a time
    const discardedDocument = discardedDocuments.at(0);
    const mappedEntity = await this.mapEntity(discardedDocument, uid);

    // If relations were populated, relations count will be returned instead of the array of relations.
    if (mappedEntity && isWebhooksPopulateRelationsEnabled()) {
      return getDeepRelationsCount(mappedEntity, uid);
    }

    return mappedEntity;
  },

  async countDraftRelations(id: string, uid: Public.UID.ContentType, locale: string) {
    const { populate, hasRelations } = getDeepPopulateDraftCount(uid);

    if (!hasRelations) {
      return 0;
    }
    const document = await strapi.documents(uid).findOne(id, { populate, locale });
    if (!document) {
      throw new ApplicationError(
        `Unable to count draft relations, document with id ${id} and locale ${locale} not found`
      );
    }
    return sumDraftCounts(document, uid);
  },

  async countManyEntriesDraftRelations(
    ids: number[],
    uid: Public.UID.ContentType,
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
