import { omit, pipe } from 'lodash/fp';
import { contentTypes, errors } from '@strapi/utils';
import type { LoadedStrapi as Strapi, Common, Schema, Documents } from '@strapi/types';
import { getService } from '../utils';
import {
  getDeepPopulate,
  getDeepPopulateDraftCount,
  isWebhooksPopulateRelationsEnabled,
} from './utils/populate';
import { sumDraftCounts } from './utils/draft';

const { ApplicationError } = errors;

const { PUBLISHED_AT_ATTRIBUTE } = contentTypes.constants;

const omitPublishedAtField = omit(PUBLISHED_AT_ATTRIBUTE);
const omitIdField = omit('id');

type DocService = Documents.SingleTypeInstance;
type DocServiceParams<TAction extends keyof DocService> = Parameters<DocService[TAction]>;

// const emitEvent = async (uid: Common.UID.ContentType, event: string, document: Document) => {
//   const modelDef = strapi.getModel(uid);
//   const sanitizedDocument = await sanitize.sanitizers.defaultSanitizeOutput(modelDef, document);

//   strapi.eventHub.emit(event, {
//     model: modelDef.modelName,
//     entry: sanitizedDocument,
//   });
// };

const buildDeepPopulate = (uid: Common.UID.SingleType) => {
  // User can configure to populate relations, so downstream services can use them.
  // They will be transformed into counts later if this is set to true.

  return getService('populate-builder')(uid)
    .populateDeep(Infinity)
    .countRelationsIf(!isWebhooksPopulateRelationsEnabled())
    .build();
};

const singleTypes = ({ strapi }: { strapi: Strapi }) => ({
  async find(opts: DocServiceParams<'find'>[0], uid: Common.UID.SingleType) {
    const params = { ...opts, populate: getDeepPopulate(uid) } as typeof opts;
    return strapi.documents<Schema.SingleType>(uid).find(params);
  },

  async createOrUpdate(
    uid: Common.UID.SingleType,
    opts: Parameters<DocService['update']>[0] = {} as any
  ) {
    const data = pipe(omitPublishedAtField, omitIdField)(opts.data || {});
    const populate = opts.populate ?? (await buildDeepPopulate(uid));
    const params = { ...opts, data, status: 'draft', populate };

    const document = await strapi.documents<Schema.SingleType>(uid).update(params);

    // if (isWebhooksPopulateRelationsEnabled()) {
    //   return getDeepRelationsCount(document, uid);
    // }

    return document;
  },

  /**
   *  Check if a document exists
   */
  async exists(uid: Common.UID.ContentType, id?: string) {
    // Collection type
    if (id) {
      const count = await strapi.db.query(uid).count({ where: { documentId: id } });
      return count > 0;
    }

    // Single type
    const count = await strapi.db.query(uid).count();
    return count > 0;
  },

  async delete(uid: Common.UID.ContentType, opts: Parameters<DocService['delete']>[0] = {} as any) {
    const populate = await buildDeepPopulate(uid);

    await strapi.documents<Schema.SingleType>(uid).delete({ ...opts, populate });

    // TODO: Return all deleted versions?
    return {};
  },

  async publish(
    uid: Common.UID.SingleType,
    opts: Parameters<DocService['publish']>[0] = {} as any
  ) {
    const populate = await buildDeepPopulate(uid);
    const params = { ...opts, populate };

    const { versions: publishedDocuments } = await strapi
      .documents<Schema.SingleType>(uid)
      .publish(params);

    // TODO: Publish many versions at once
    const publishedDocument = publishedDocuments.at(0);

    // If relations were populated, relations count will be returned instead of the array of relations.
    // if (mappedEntity && isWebhooksPopulateRelationsEnabled()) {
    //   return getDeepRelationsCount(mappedEntity, uid);
    // }

    return publishedDocument;
  },

  async unpublish(
    uid: Common.UID.SingleType,
    opts: Parameters<DocService['unpublish']>[0] = {} as any
  ) {
    const populate = await buildDeepPopulate(uid);
    const params = { ...opts, populate };

    // TODO: What if we publish many versions at once?
    await strapi.documents<Schema.SingleType>(uid).unpublish(params);

    // If relations were populated, relations count will be returned instead of the array of relations.
    // if (unpublishedDocument && isWebhooksPopulateRelationsEnabled()) {
    // return getDeepRelationsCount(unpublishedDocument, uid);
    // }

    return {};
  },

  async discard(
    uid: Common.UID.SingleType,
    opts: Parameters<DocService['discardDraft']>[0] = {} as any
  ) {
    const populate = await buildDeepPopulate(uid);
    const params = { ...opts, populate };

    const { versions: discardedDocuments } = await strapi
      .documents<Schema.SingleType>(uid)
      .discardDraft(params);

    // We only discard one document at a time
    const discardedDocument = discardedDocuments.at(0);

    // If relations were populated, relations count will be returned instead of the array of relations.
    // if (mappedEntity && isWebhooksPopulateRelationsEnabled()) {
    //   return getDeepRelationsCount(mappedEntity, uid);
    // }

    return discardedDocument;
  },

  async countDraftRelations(uid: Common.UID.ContentType, locale: string) {
    const { populate, hasRelations } = getDeepPopulateDraftCount(uid);

    if (!hasRelations) {
      return 0;
    }
    const document = await strapi.documents<Schema.SingleType>(uid).find({ populate, locale });

    if (!document) {
      throw new ApplicationError(
        `Unable to count draft relations, document with locale ${locale} not found`
      );
    }
    return sumDraftCounts(document, uid);
  },
});

export type SingleTypesService = typeof singleTypes;

export default singleTypes;
