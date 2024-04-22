import { omit, pipe } from 'lodash/fp';

import { contentTypes, sanitize, errors } from '@strapi/utils';
import type { Core, Modules, UID } from '@strapi/types';

import { buildDeepPopulate, getDeepPopulate, getDeepPopulateDraftCount } from './utils/populate';
import { sumDraftCounts } from './utils/draft';
import { ALLOWED_WEBHOOK_EVENTS } from '../constants';

type DocService = Modules.Documents.ServiceInstance;
type DocServiceParams<TAction extends keyof DocService> = Parameters<DocService[TAction]>[0];
export type Document = Modules.Documents.Result<UID.ContentType>;

const { ApplicationError } = errors;
const { ENTRY_PUBLISH, ENTRY_UNPUBLISH } = ALLOWED_WEBHOOK_EVENTS;
const { PUBLISHED_AT_ATTRIBUTE } = contentTypes.constants;

const omitPublishedAtField = omit(PUBLISHED_AT_ATTRIBUTE);
const omitIdField = omit('id');

const emitEvent = async (uid: UID.ContentType, event: string, document: Document) => {
  const modelDef = strapi.getModel(uid);
  const sanitizedDocument = await sanitize.sanitizers.defaultSanitizeOutput(
    {
      schema: modelDef,
      getModel(uid) {
        return strapi.getModel(uid as UID.Schema);
      },
    },
    document
  );

  strapi.eventHub.emit(event, {
    model: modelDef.modelName,
    entry: sanitizedDocument,
  });
};

const documentManager = ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    async findOne(
      id: string,
      uid: UID.CollectionType,
      opts: Omit<DocServiceParams<'findOne'>, 'documentId'> = {}
    ) {
      return strapi.documents(uid).findOne({ ...opts, documentId: id });
    },

    /**
     * Find multiple (or all) locales for a document
     */
    async findLocales(
      id: string | undefined,
      uid: UID.CollectionType,
      opts: {
        populate?: Modules.Documents.Params.Pick<any, 'populate'>;
        locale?: string | string[] | '*';
      }
    ) {
      // Will look for a specific locale by default
      const where: any = {};

      // Might not have an id if querying a single type
      if (id) {
        where.documentId = id;
      }

      // Search in array of locales
      if (Array.isArray(opts.locale)) {
        where.locale = { $in: opts.locale };
      } else if (opts.locale && opts.locale !== '*') {
        // Look for a specific locale, ignore if looking for all locales
        where.locale = opts.locale;
      }

      return strapi.db.query(uid).findMany({ populate: opts.populate, where });
    },

    async findMany(opts: DocServiceParams<'findMany'>, uid: UID.CollectionType) {
      const params = { ...opts, populate: getDeepPopulate(uid) } as typeof opts;
      return strapi.documents(uid).findMany(params);
    },

    async findPage(opts: DocServiceParams<'findMany'>, uid: UID.CollectionType) {
      // Pagination
      const page = Number(opts?.page) || 1;
      const pageSize = Number(opts?.pageSize) || 10;

      const [documents, total = 0] = await Promise.all([
        strapi.documents(uid).findMany(opts),
        strapi.documents(uid).count(opts),
      ]);

      return {
        results: documents,
        pagination: {
          page,
          pageSize,
          pageCount: Math.ceil(total! / pageSize),
          total,
        },
      };
    },

    async create(uid: UID.CollectionType, opts: DocServiceParams<'create'> = {} as any) {
      const populate = opts.populate ?? (await buildDeepPopulate(uid));
      const params = { ...opts, status: 'draft' as const, populate };

      return strapi.documents(uid).create(params);
    },

    async update(
      id: Modules.Documents.ID,
      uid: UID.CollectionType,
      opts: Omit<DocServiceParams<'update'>, 'documentId'> = {} as any
    ) {
      const publishData = pipe(omitPublishedAtField, omitIdField)(opts.data || {});
      const populate = opts.populate ?? (await buildDeepPopulate(uid));
      const params = { ...opts, data: publishData, populate, status: 'draft' };

      return strapi.documents(uid).update({ ...params, documentId: id });
    },

    async clone(
      id: Modules.Documents.ID,
      body: Partial<Modules.Documents.Params.Data.Input<UID.CollectionType>>,
      uid: UID.CollectionType
    ) {
      const populate = await buildDeepPopulate(uid);
      const params = {
        data: {
          ...omitIdField(body),
          [PUBLISHED_AT_ATTRIBUTE]: null,
        },
        populate,
      };

      return strapi
        .documents(uid)
        .clone({ ...params, documentId: id })
        .then((result) => result?.entries.at(0));
    },

    /**
     *  Check if a document exists
     */
    async exists(uid: UID.CollectionType, id?: string) {
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
      id: Modules.Documents.ID,
      uid: UID.CollectionType,
      opts: Omit<DocServiceParams<'delete'>, 'documentId'> = {} as any
    ) {
      const populate = await buildDeepPopulate(uid);

      await strapi.documents(uid).delete({
        ...opts,
        documentId: id,
        populate,
      });
      return {};
    },

    // FIXME: handle relations
    async deleteMany(opts: DocServiceParams<'findMany'>, uid: UID.CollectionType) {
      const docs = await strapi.documents(uid).findMany(opts);

      for (const doc of docs) {
        await strapi.documents!(uid).delete({ documentId: doc.documentId });
      }

      return { count: docs.length };
    },

    async publish(
      id: Modules.Documents.ID,
      uid: UID.CollectionType,
      opts: Omit<DocServiceParams<'publish'>, 'documentId'> = {} as any
    ) {
      const populate = await buildDeepPopulate(uid);
      const params = { ...opts, populate };

      return strapi
        .documents(uid)
        .publish({ ...params, documentId: id })
        .then((result) => result?.entries.at(0));
    },

    async publishMany(entities: Document[], uid: UID.ContentType) {
      if (!entities.length) {
        return null;
      }

      // Validate entities before publishing, throw if invalid
      await Promise.all(
        entities.map((document: Document) => {
          return strapi.entityValidator.validateEntityCreation(
            strapi.getModel(uid),
            document,
            undefined,
            // @ts-expect-error - FIXME: entity here is unnecessary
            document
          );
        })
      );

      // Only publish entities without a published_at date
      const entitiesToPublish = entities
        .filter((doc: Document) => !doc[PUBLISHED_AT_ATTRIBUTE])
        .map((doc: Document) => doc.id);

      const filters = { id: { $in: entitiesToPublish } };
      const data = { [PUBLISHED_AT_ATTRIBUTE]: new Date() };
      const populate = await buildDeepPopulate(uid);

      // Everything is valid, publish
      const publishedEntitiesCount = await strapi.db.query(uid).updateMany({
        where: filters,
        data,
      });
      // Get the updated entities since updateMany only returns the count
      const publishedEntities = await strapi.db.query(uid).findMany({
        where: filters,
        populate,
      });
      // Emit the publish event for all updated entities
      await Promise.all(
        publishedEntities!.map((doc: Document) => emitEvent(uid, ENTRY_PUBLISH, doc))
      );

      // Return the number of published entities
      return publishedEntitiesCount;
    },

    async unpublishMany(documents: Document[], uid: UID.CollectionType) {
      if (!documents.length) {
        return null;
      }

      // Only unpublish entities with a published_at date
      const entitiesToUnpublish = documents
        .filter((doc: Document) => doc[PUBLISHED_AT_ATTRIBUTE])
        .map((doc: Document) => doc.id);

      const filters = { id: { $in: entitiesToUnpublish } };
      const data = { [PUBLISHED_AT_ATTRIBUTE]: null };
      const populate = await buildDeepPopulate(uid);

      // No need to validate, unpublish
      const unpublishedEntitiesCount = await strapi.db.query(uid).updateMany({
        where: filters,
        data,
      });

      // Get the updated entities since updateMany only returns the count
      const unpublishedEntities = await strapi.db.query(uid).findMany({
        where: filters,
        populate,
      });

      // Emit the unpublish event for all updated entities
      await Promise.all(
        unpublishedEntities!.map((doc: Document) => emitEvent(uid, ENTRY_UNPUBLISH, doc))
      );

      // Return the number of unpublished entities
      return unpublishedEntitiesCount;
    },

    async unpublish(
      id: Modules.Documents.ID,
      uid: UID.CollectionType,
      opts: Omit<DocServiceParams<'unpublish'>, 'documentId'> = {} as any
    ) {
      const populate = await buildDeepPopulate(uid);
      const params = { ...opts, populate };

      return strapi
        .documents(uid)
        .unpublish({ ...params, documentId: id })
        .then((result) => result?.entries.at(0));
    },

    async discardDraft(
      id: Modules.Documents.ID,
      uid: UID.CollectionType,
      opts: Omit<DocServiceParams<'discardDraft'>, 'documentId'> = {} as any
    ) {
      const populate = await buildDeepPopulate(uid);
      const params = { ...opts, populate };

      return strapi
        .documents(uid)
        .discardDraft({ ...params, documentId: id })
        .then((result) => result?.entries.at(0));
    },

    async countDraftRelations(id: string, uid: UID.ContentType, locale: string) {
      const { populate, hasRelations } = getDeepPopulateDraftCount(uid);

      if (!hasRelations) {
        return 0;
      }
      const document = await strapi.documents(uid).findOne({ documentId: id, populate, locale });
      if (!document) {
        throw new ApplicationError(
          `Unable to count draft relations, document with id ${id} and locale ${locale} not found`
        );
      }
      return sumDraftCounts(document, uid);
    },

    async countManyEntriesDraftRelations(ids: number[], uid: UID.CollectionType, locale: string) {
      const { populate, hasRelations } = getDeepPopulateDraftCount(uid);

      if (!hasRelations) {
        return 0;
      }

      const entities = await strapi.db.query(uid).findMany({
        populate,
        where: {
          id: { $in: ids },
          ...(locale ? { locale } : {}),
        },
      });

      const totalNumberDraftRelations: number = entities!.reduce(
        (count: number, entity: Document) => sumDraftCounts(entity, uid) + count,
        0
      );

      return totalNumberDraftRelations;
    },
  };
};

export type DocumentManagerService = typeof documentManager;

export default documentManager;
