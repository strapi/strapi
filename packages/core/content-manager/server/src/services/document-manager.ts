import { omit, pipe } from 'lodash/fp';

import { contentTypes, errors, pagination } from '@strapi/utils';
import type { Core, Modules, UID } from '@strapi/types';

import { buildDeepPopulate, getDeepPopulate, getDeepPopulateDraftCount } from './utils/populate';
import { sumDraftCounts } from './utils/draft';

type DocService = Modules.Documents.ServiceInstance;
type DocServiceParams<TAction extends keyof DocService> = Parameters<DocService[TAction]>[0];
export type Document = Modules.Documents.Result<UID.ContentType>;

const { ApplicationError } = errors;
const { PUBLISHED_AT_ATTRIBUTE } = contentTypes.constants;

const omitPublishedAtField = omit(PUBLISHED_AT_ATTRIBUTE);
const omitIdField = omit('id');

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
      id: string | string[] | undefined,
      uid: UID.CollectionType,
      opts: {
        populate?: Modules.Documents.Params.Pick<any, 'populate'>;
        locale?: string | string[] | '*';
        isPublished?: boolean;
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

      // Published is passed, so we filter on it, otherwise we don't filter
      if (typeof opts.isPublished === 'boolean') {
        where.publishedAt = { $notNull: opts.isPublished };
      }

      return strapi.db.query(uid).findMany({ populate: opts.populate, where });
    },

    async findMany(opts: DocServiceParams<'findMany'>, uid: UID.CollectionType) {
      const params = { ...opts, populate: getDeepPopulate(uid) } as typeof opts;
      return strapi.documents(uid).findMany(params);
    },

    async findPage(opts: DocServiceParams<'findMany'>, uid: UID.CollectionType) {
      const params = pagination.withDefaultPagination(opts || {}, {
        maxLimit: 1000,
      });

      const [documents, total = 0] = await Promise.all([
        strapi.documents(uid).findMany(params),
        strapi.documents(uid).count(params),
      ]);

      return {
        results: documents,
        pagination: pagination.transformPagedPaginationInfo(params, total),
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
        data: omitIdField(body),
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
    async deleteMany(
      documentIds: Modules.Documents.ID[],
      uid: UID.CollectionType,
      opts: DocServiceParams<'findMany'> & { locale?: string } = {}
    ) {
      const deletedEntries = await strapi.db.transaction(async () => {
        return Promise.all(documentIds.map(async (id) => this.delete(id, uid, opts)));
      });

      return { count: deletedEntries.length };
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
        .then((result) => result?.entries);
    },

    async publishMany(uid: UID.ContentType, documentIds: string[], locale?: string | string[]) {
      return strapi.db.transaction(async () => {
        const results = await Promise.all(
          documentIds.map((documentId) => this.publish(documentId, uid, { locale }))
        );

        const publishedEntitiesCount = results.flat().filter(Boolean).length;
        return publishedEntitiesCount;
      });
    },

    async unpublishMany(
      documentIds: Modules.Documents.ID[],
      uid: UID.CollectionType,
      opts: Omit<DocServiceParams<'unpublish'>, 'documentId'> = {} as any
    ) {
      const unpublishedEntries = await strapi.db.transaction(async () => {
        return Promise.all(
          documentIds.map((id) =>
            strapi
              .documents(uid)
              .unpublish({ ...opts, documentId: id })
              .then((result) => result?.entries)
          )
        );
      });

      const unpublishedEntitiesCount = unpublishedEntries.flat().filter(Boolean).length;

      // Return the number of unpublished entities
      return { count: unpublishedEntitiesCount };
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

    async countManyEntriesDraftRelations(
      documentIds: Modules.Documents.ID[],
      uid: UID.CollectionType,
      locale: string | string[]
    ) {
      const { populate, hasRelations } = getDeepPopulateDraftCount(uid);

      if (!hasRelations) {
        return 0;
      }

      let localeFilter = {};
      if (locale) {
        localeFilter = Array.isArray(locale) ? { locale: { $in: locale } } : { locale };
      }

      const entities = await strapi.db.query(uid).findMany({
        populate,
        where: {
          documentId: { $in: documentIds },
          ...localeFilter,
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
