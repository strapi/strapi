import { omit, assoc, merge, curry, isEmpty, pick } from 'lodash/fp';

import {
  async,
  contentTypes as contentTypesUtils,
  validate,
  errors,
  createModelCache,
} from '@strapi/utils';

import type { UID, Modules } from '@strapi/types';
import { wrapInTransaction, type RepositoryFactoryMethod } from './common';
import * as DP from './draft-and-publish';
import * as i18n from './internationalization';
import { copyNonLocalizedFields } from './internationalization';
import * as components from './components';

import { createEntriesService } from './entries';
import { ALLOWED_DOCUMENT_ROOT_PARAM_KEYS, pickSelectionParams } from './params';
import { createDocumentId } from '../../utils/transform-content-types-to-models';
import { getDeepPopulate } from './utils/populate';
import { transformParamsToQuery } from './transform/query';
import { transformParamsDocumentId } from './transform/id-transform';
import { createEventManager } from './events';
import * as unidirectionalRelations from './utils/unidirectional-relations';
import * as bidirectionalRelations from './utils/bidirectional-relations';
import entityValidator from '../entity-validator';
import { addFirstPublishedAtToDraft, filterDataFirstPublishedAt } from './first-published-at';
import { runParallelWithOrderedErrors } from './utils/ordered-parallel';

const { validators } = validate;

// we have to typecast to reconcile the differences between validator and database getModel
const getModel = ((schema: UID.Schema) => strapi.getModel(schema)) as (schema: string) => any;

// config.api.documents.strictParams: false/undefined (pass through), true (throw on invalid)

// BCP 47–style locale format: 2–3 letter language code (any case), optional subtags (-XX or -XXX...), max 35 chars
const LOCALE_FORMAT = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/;
const MAX_LOCALE_LENGTH = 35;

/** Treat as "param not provided": null, undefined, or empty string (e.g. from query/JSON). */
const isParamEmpty = (v: unknown): boolean => v === undefined || v === null || v === '';

export const createContentTypeRepository: RepositoryFactoryMethod = (
  uid,
  validator = entityValidator
) => {
  const contentType = strapi.contentType(uid);
  const hasDraftAndPublish = contentTypesUtils.hasDraftAndPublish(contentType);

  // Define the validations that should be performed
  const sortValidations = ['nonAttributesOperators', 'dynamicZones', 'morphRelations'];
  const fieldValidations = ['scalarAttributes'];
  const filtersValidations = ['nonAttributesOperators', 'dynamicZones', 'morphRelations'];
  const populateValidations = {
    sort: sortValidations,
    field: fieldValidations,
    filters: filtersValidations,
    populate: ['nonAttributesOperators'],
  };

  /**
   * Checks status parameter. When strict is true, throws on invalid status.
   * Valid values are 'published' and 'draft'; for types without D&P they are currently ignored but may throw in the future
   */
  const checkStatus = (
    params: Record<string, unknown>,
    strict: boolean
  ): Record<string, unknown> => {
    if (!strict) {
      return params;
    }

    if (isParamEmpty(params.status)) {
      delete params.status;
      return params;
    }

    if (params.status !== 'published' && params.status !== 'draft') {
      throw new errors.ValidationError(
        `Invalid parameter at 'status'. Expected 'published' or 'draft', received: ${params.status}`
      );
    }

    return params;
  };

  /**
   * Checks locale parameter. When strict is true, throws on invalid locale value.
   * Accepts only: string (single locale or '*'), array of locale strings (e.g. bulk publish),
   * empty string, null, or undefined (removed but allowed)
   */
  const checkLocale = (
    params: Record<string, unknown>,
    strict: boolean
  ): Record<string, unknown> => {
    if (!strict) {
      return params;
    }

    if (isParamEmpty(params.locale)) {
      delete params.locale;
      return params;
    }

    // Reject objects (we only accept string, array of strings, empty string, null, undefined)
    if (typeof params.locale === 'object' && !Array.isArray(params.locale)) {
      throw new errors.ValidationError(
        `Invalid parameter at 'locale'. Expected a string, array of strings, empty string, null, or undefined; received: object`,
        { received: params.locale }
      );
    }

    const validateAndNormalizeOne = (value: unknown, path: string): string => {
      if (typeof value !== 'string') {
        throw new errors.ValidationError(
          `Invalid parameter at '${path}'. Expected a string, received: ${typeof value}`,
          { received: value }
        );
      }
      if (value === '*') return value;
      const isEmpty = value.length === 0;
      const tooLong = value.length > MAX_LOCALE_LENGTH;
      const invalidFormat = !LOCALE_FORMAT.test(value);
      if (isEmpty || tooLong || invalidFormat) {
        let reason: string;
        if (isEmpty) {
          reason = 'Locale cannot be empty';
        } else if (tooLong) {
          reason = `Locale exceeds maximum length of ${MAX_LOCALE_LENGTH} characters`;
        } else {
          reason = 'Locale must be a valid BCP 47 format (e.g. en, en-US, zh-Hans)';
        }
        throw new errors.ValidationError(`Invalid parameter at '${path}'. ${reason}.`);
      }
      return value;
    };

    if (Array.isArray(params.locale)) {
      const filtered = (params.locale as unknown[]).filter(
        (item): item is string => typeof item === 'string' && !isParamEmpty(item)
      );
      if (filtered.length === 0) {
        delete params.locale;
        return params;
      }
      params.locale = filtered.map((item, i) => validateAndNormalizeOne(item, `locale[${i}]`));
      return params;
    }

    params.locale = validateAndNormalizeOne(params.locale, 'locale');
    return params;
  };

  /**
   * Pagination param parsing (used only when strict).
   * Contract: empty (null/undefined/'') → undefined (omit from result).
   *           present but invalid → throw ValidationError.
   *           present and valid → return normalized value.
   */
  const parsePaginationInt = (
    name: string,
    value: unknown,
    strict: boolean,
    spec: { min: number; allowMinusOne?: boolean }
  ): number | undefined => {
    if (isParamEmpty(value)) return undefined;
    const num = Number(value);
    const valid =
      Number.isInteger(num) && (num >= spec.min || (spec.allowMinusOne === true && num === -1));
    if (!valid && strict) {
      const expected = spec.allowMinusOne
        ? `integer >= ${spec.min} or -1`
        : `integer >= ${spec.min}`;
      throw new errors.ValidationError(
        `Invalid parameter at '${name}'. Expected ${expected}, received: ${value}`
      );
    }
    return valid ? num : undefined;
  };

  const parseWithCount = (value: unknown): boolean | undefined => {
    if (isParamEmpty(value)) return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string' && (value === 'true' || value === 'false'))
      return value === 'true';
    throw new errors.ValidationError(
      `Invalid parameter at 'withCount'. Expected a boolean, received: ${typeof value}`
    );
  };

  const PAGINATION_KEYS = ['page', 'pageSize', 'start', 'limit', 'withCount'] as const;

  /**
   * When strict: empty → omit, invalid → throw, valid → include.
   * When not strict: return params unchanged.
   */
  const checkPagination = (
    params: Record<string, unknown>,
    strict: boolean
  ): Record<string, unknown> => {
    if (!strict) return params;

    const hasPage = !isParamEmpty(params.page) || !isParamEmpty(params.pageSize);
    const hasOffset = !isParamEmpty(params.start) || !isParamEmpty(params.limit);
    if (hasPage && hasOffset) {
      throw new errors.ValidationError(
        'Invalid pagination parameters. Cannot use both page-based (page, pageSize) and offset-based (start, limit) pagination in the same query.'
      );
    }

    const page = parsePaginationInt('page', params.page, strict, { min: 1 });
    const pageSize = parsePaginationInt('pageSize', params.pageSize, strict, { min: 1 });
    const start = parsePaginationInt('start', params.start, strict, { min: 0 });
    const limit = parsePaginationInt('limit', params.limit, strict, {
      min: 1,
      allowMinusOne: true,
    });
    const withCount = parseWithCount(params.withCount);

    const result = { ...omit(PAGINATION_KEYS, params) };
    if (page !== undefined) result.page = page;
    if (pageSize !== undefined) result.pageSize = pageSize;
    if (start !== undefined) result.start = start;
    if (limit !== undefined) result.limit = limit;
    if (withCount !== undefined) result.withCount = withCount;
    return result;
  };

  /**
   * When strict is true, strip to allowed root-level keys so only those reach the query.
   * Extra params (e.g. from content API addQueryParams) are allowed in so middlewares see them,
   * but are stripped here before the query pipeline; they never affect the document query.
   */
  const checkUnrecognizedRootParams = (
    params: Record<string, unknown>,
    strict: boolean
  ): Record<string, unknown> => {
    if (!strict) {
      return params;
    }

    return pick(ALLOWED_DOCUMENT_ROOT_PARAM_KEYS as unknown as string[], params) as Record<
      string,
      unknown
    >;
  };

  const validateParams = async (
    params: Modules.Documents.Params.All
  ): Promise<Modules.Documents.Params.All> => {
    // Cache model lookups for this request to avoid repeating the same work
    const modelCache = createModelCache(getModel);

    const ctx = { schema: contentType, getModel: modelCache.getModel };

    // Only validate what is actually provided
    const validations: Promise<unknown>[] = [];

    if (params.filters && !isEmpty(params.filters)) {
      validations.push(validators.validateFilters(ctx, params.filters, filtersValidations));
    }

    if (params.sort && !isEmpty(params.sort)) {
      validations.push(validators.validateSort(ctx, params.sort, sortValidations));
    }

    if (params.fields && !isEmpty(params.fields)) {
      validations.push(validators.validateFields(ctx, params.fields, fieldValidations));
    }

    if (params.populate && !isEmpty(params.populate)) {
      validations.push(validators.validatePopulate(ctx, params.populate, populateValidations));
    }

    // Run validations together but keep the same error order as before
    await runParallelWithOrderedErrors(validations);

    // Clean up cache after validation
    modelCache.clear();

    // Strip lookup from params, it's only used internally
    if (params.lookup) {
      throw new errors.ValidationError("Invalid params: 'lookup'");
    }

    // Validate status, locale, and pagination based on config
    // config.api.documents.strictParams: false/undefined (pass through), true (throw on invalid)
    const rawStrictParams: unknown = strapi.config.get('api.documents.strictParams', undefined);

    if (rawStrictParams !== undefined && rawStrictParams !== false && rawStrictParams !== true) {
      throw new errors.ValidationError(
        `Invalid config.api.documents.strictParams value: "${rawStrictParams}". Expected boolean (true or false).`
      );
    }

    const strict = rawStrictParams === true;

    let processedParams: Record<string, unknown>;
    if (strict) {
      processedParams = checkUnrecognizedRootParams(params as Record<string, unknown>, strict);
      processedParams = checkStatus(processedParams, strict);
      processedParams = checkLocale(processedParams, strict);
      processedParams = checkPagination(processedParams, strict);
    } else {
      processedParams = params as Record<string, unknown>;
    }

    return processedParams as Modules.Documents.Params.All;
  };

  const entries = createEntriesService(uid, validator);

  const eventManager = createEventManager(strapi, uid);
  const emitEvent = curry(eventManager.emitEvent);

  async function findMany(params = {} as any) {
    const query = await async.pipe(
      validateParams,
      DP.defaultToDraft,
      DP.statusToLookup(contentType),

      i18n.defaultLocale(contentType),
      i18n.multiLocaleToLookup(contentType),
      transformParamsDocumentId(uid),
      transformParamsToQuery(uid)
    )(params || {});

    return strapi.db.query(uid).findMany(query);
  }

  async function findFirst(params = {} as any) {
    const query = await async.pipe(
      validateParams,
      DP.defaultToDraft,
      DP.statusToLookup(contentType),

      i18n.defaultLocale(contentType),
      i18n.localeToLookup(contentType),
      transformParamsDocumentId(uid),
      transformParamsToQuery(uid)
    )(params);

    return strapi.db.query(uid).findOne(query);
  }

  // TODO: do we really want to add filters on the findOne now that we have findFirst ?
  async function findOne(opts = {} as any) {
    const { documentId, ...params } = opts;

    const query = await async.pipe(
      validateParams,
      DP.defaultToDraft,
      DP.statusToLookup(contentType),

      i18n.defaultLocale(contentType),
      i18n.localeToLookup(contentType),
      transformParamsDocumentId(uid),
      transformParamsToQuery(uid),
      (query) => assoc('where', { ...query.where, documentId }, query)
    )(params);

    return strapi.db.query(uid).findOne(query);
  }

  async function deleteDocument(opts = {} as any) {
    const { documentId, ...params } = opts;

    const query = await async.pipe(
      validateParams,
      omit('status'),
      i18n.defaultLocale(contentType),
      i18n.multiLocaleToLookup(contentType),
      transformParamsToQuery(uid),
      (query) => assoc('where', { ...query.where, documentId }, query)
    )(params);

    if (hasDraftAndPublish && params.status === 'draft') {
      throw new Error('Cannot delete a draft document');
    }

    const entriesToDelete = await strapi.db.query(uid).findMany(query);

    // Delete all matched entries and its components
    const deletedEntries = await async.map(entriesToDelete, (entryToDelete: any) =>
      entries.delete(entryToDelete.id)
    );

    entriesToDelete.forEach(emitEvent('entry.delete'));

    return { documentId, entries: deletedEntries };
  }

  async function create(opts = {} as any) {
    const { documentId, ...params } = opts;

    const queryParams = await async.pipe(
      validateParams,
      DP.filterDataPublishedAt,
      DP.setStatusToDraft(contentType),
      DP.statusToData(contentType),
      i18n.defaultLocale(contentType),
      i18n.localeToData(contentType)
    )(params);

    const doc = await entries.create(queryParams);

    emitEvent('entry.create', doc);

    if (hasDraftAndPublish && params.status === 'published') {
      return publish({
        ...params,
        documentId: doc.documentId,
      }).then((doc) => doc.entries[0]);
    }

    return doc;
  }

  async function clone(opts = {} as any) {
    const { documentId, ...params } = opts;

    const queryParams = await async.pipe(
      validateParams,
      DP.filterDataPublishedAt,
      i18n.defaultLocale(contentType),
      i18n.multiLocaleToLookup(contentType)
    )(params);

    // Get deep populate
    const entriesToClone = await strapi.db.query(uid).findMany({
      where: {
        ...queryParams?.lookup,
        documentId,
        // DP Enabled: Clone drafts
        // DP Disabled: Clone only the existing version (published)
        publishedAt: { $null: hasDraftAndPublish },
      },
      populate: getDeepPopulate(uid, { relationalFields: ['id'] }),
    });

    const clonedEntries = await async.map(
      entriesToClone,
      async.pipe(
        omit(['id', 'createdAt', 'updatedAt']),
        // assign new documentId
        assoc('documentId', createDocumentId()),
        // Merge new data into it
        (data) => merge(data, queryParams.data),
        (data) => entries.create({ ...queryParams, data, status: 'draft' })
      )
    );

    clonedEntries.forEach(emitEvent('entry.create'));

    return { documentId: clonedEntries.at(0)?.documentId, entries: clonedEntries };
  }

  async function update(opts = {} as any) {
    const { documentId, ...params } = opts;

    const queryParams = await async.pipe(
      validateParams,
      DP.filterDataPublishedAt,
      filterDataFirstPublishedAt,
      DP.setStatusToDraft(contentType),
      DP.statusToLookup(contentType),
      DP.statusToData(contentType),
      // Default locale will be set if not provided
      i18n.defaultLocale(contentType),
      i18n.localeToLookup(contentType),
      i18n.localeToData(contentType)
    )(params);

    const { data, ...restParams } = await transformParamsDocumentId(uid, queryParams || {});
    const query = transformParamsToQuery(uid, pickSelectionParams(restParams || {}) as any);

    // Validation
    // Find if document exists
    const entryToUpdate = await strapi.db
      .query(uid)
      .findOne({ ...query, where: { ...queryParams?.lookup, ...query?.where, documentId } });

    let updatedDraft = null;
    if (entryToUpdate) {
      updatedDraft = await entries.update(entryToUpdate, queryParams);
      emitEvent('entry.update', updatedDraft);
    }

    if (!updatedDraft) {
      const documentExists = await strapi.db
        .query(contentType.uid)
        .findOne({ where: { documentId } });

      if (documentExists) {
        const mergedData = await copyNonLocalizedFields(contentType, documentId, {
          ...queryParams.data,
          documentId,
        });

        updatedDraft = await entries.create({
          ...queryParams,
          data: mergedData,
        });
        emitEvent('entry.create', updatedDraft);
      }
    }

    if (hasDraftAndPublish && updatedDraft && params.status === 'published') {
      return publish({
        ...params,
        documentId,
      }).then((doc) => doc.entries[0]);
    }

    return updatedDraft;
  }

  async function count(params = {} as any) {
    const query = await async.pipe(
      validateParams,
      DP.defaultStatus(contentType),
      DP.statusToLookup(contentType),

      i18n.defaultLocale(contentType),
      i18n.multiLocaleToLookup(contentType),
      transformParamsToQuery(uid)
    )(params);

    return strapi.db.query(uid).count(query);
  }

  async function publish(opts = {} as any) {
    const { documentId, ...params } = opts;

    const queryParams = await async.pipe(
      validateParams,
      i18n.defaultLocale(contentType),
      i18n.multiLocaleToLookup(contentType)
    )(params);

    const [draftsToPublish, oldPublishedVersions] = await Promise.all([
      strapi.db.query(uid).findMany({
        where: {
          ...queryParams?.lookup,
          documentId,
          publishedAt: null, // Ignore lookup
        },
        // Populate relations, media, compos and dz
        populate: getDeepPopulate(uid, { relationalFields: ['documentId', 'locale'] }),
      }),
      strapi.db.query(uid).findMany({
        where: {
          ...queryParams?.lookup,
          documentId,
          publishedAt: { $ne: null },
        },
        select: ['id', 'locale'],
      }),
    ]);

    // Load any unidirectional relation targetting the old published entries
    const relationsToSync = await unidirectionalRelations.load(
      uid,
      {
        newVersions: draftsToPublish,
        oldVersions: oldPublishedVersions,
      },
      {
        shouldPropagateRelation: components.createComponentRelationFilter(),
      }
    );

    const bidirectionalRelationsToSync = await bidirectionalRelations.load(uid, {
      newVersions: draftsToPublish,
      oldVersions: oldPublishedVersions,
    });

    // Delete old published versions
    await async.map(oldPublishedVersions, (entry: any) => entries.delete(entry.id));

    // Add firstPublishedAt to draft if it doesn't exist
    const updatedDraft = await async.map(draftsToPublish, (draft: any) =>
      addFirstPublishedAtToDraft(draft, entries.update, contentType)
    );

    // Transform draft entry data and create published versions
    const publishedEntries = await async.map(updatedDraft, (draft: any) =>
      entries.publish(draft, queryParams)
    );

    // Sync unidirectional relations with the new published entries
    await unidirectionalRelations.sync(
      [...oldPublishedVersions, ...updatedDraft],
      publishedEntries,
      relationsToSync
    );

    await bidirectionalRelations.sync(
      [...oldPublishedVersions, ...updatedDraft],
      publishedEntries,
      bidirectionalRelationsToSync
    );

    publishedEntries.forEach(emitEvent('entry.publish'));

    return { documentId, entries: publishedEntries };
  }

  async function unpublish(opts = {} as any) {
    const { documentId, ...params } = opts;

    const query = await async.pipe(
      validateParams,
      i18n.defaultLocale(contentType),
      i18n.multiLocaleToLookup(contentType),
      transformParamsToQuery(uid),
      (query) => assoc('where', { ...query.where, documentId, publishedAt: { $ne: null } }, query)
    )(params);

    // Delete all published versions
    const versionsToDelete = await strapi.db.query(uid).findMany(query);
    await async.map(versionsToDelete, (entry: any) => entries.delete(entry.id));

    versionsToDelete.forEach(emitEvent('entry.unpublish'));
    return { documentId, entries: versionsToDelete };
  }

  async function discardDraft(opts = {} as any) {
    const { documentId, ...params } = opts;

    const queryParams = await async.pipe(
      validateParams,
      i18n.defaultLocale(contentType),
      i18n.multiLocaleToLookup(contentType)
    )(params);

    const [versionsToDraft, oldDrafts] = await Promise.all([
      strapi.db.query(uid).findMany({
        where: {
          ...queryParams?.lookup,
          documentId,
          publishedAt: { $ne: null },
        },
        // Populate relations, media, compos and dz
        populate: getDeepPopulate(uid, { relationalFields: ['documentId', 'locale'] }),
      }),
      strapi.db.query(uid).findMany({
        where: {
          ...queryParams?.lookup,
          documentId,
          publishedAt: null,
        },
        select: ['id', 'locale'],
      }),
    ]);

    // Load any unidirectional relation targeting the old drafts
    const relationsToSync = await unidirectionalRelations.load(
      uid,
      {
        newVersions: versionsToDraft,
        oldVersions: oldDrafts,
      },
      {
        shouldPropagateRelation: components.createComponentRelationFilter(),
      }
    );

    const bidirectionalRelationsToSync = await bidirectionalRelations.load(uid, {
      newVersions: versionsToDraft,
      oldVersions: oldDrafts,
    });

    // Delete old drafts
    await async.map(oldDrafts, (entry: any) => entries.delete(entry.id));

    // Transform published entry data and create draft versions
    const draftEntries = await async.map(versionsToDraft, (entry: any) =>
      entries.discardDraft(entry, queryParams)
    );

    // Sync unidirectional relations with the new draft entries
    await unidirectionalRelations.sync(
      [...oldDrafts, ...versionsToDraft],
      draftEntries,
      relationsToSync
    );

    await bidirectionalRelations.sync(
      [...oldDrafts, ...versionsToDraft],
      draftEntries,
      bidirectionalRelationsToSync
    );

    draftEntries.forEach(emitEvent('entry.draft-discard'));
    return { documentId, entries: draftEntries };
  }

  async function updateComponents(entry: any, data: any) {
    return components.updateComponents(uid, entry, data);
  }

  function omitComponentData(data: any) {
    return components.omitComponentData(contentType, data);
  }

  return {
    findMany: wrapInTransaction(findMany),
    findFirst: wrapInTransaction(findFirst),
    findOne: wrapInTransaction(findOne),
    delete: wrapInTransaction(deleteDocument),
    create: wrapInTransaction(create),
    clone: wrapInTransaction(clone),
    update: wrapInTransaction(update),
    count: wrapInTransaction(count),
    publish: hasDraftAndPublish ? wrapInTransaction(publish) : (undefined as any),
    unpublish: hasDraftAndPublish ? wrapInTransaction(unpublish) : (undefined as any),
    discardDraft: hasDraftAndPublish ? wrapInTransaction(discardDraft) : (undefined as any),

    updateComponents,
    omitComponentData,
  };
};
