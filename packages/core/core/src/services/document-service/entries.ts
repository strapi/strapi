import type { UID, Modules } from '@strapi/types';
import { async, errors } from '@strapi/utils';
import { createId as createDocumentId } from '@paralleldrive/cuid2';
import { assoc, omit } from 'lodash/fp';

import * as components from './components';

import { transformParamsDocumentId } from './transform/id-transform';
import { transformParamsToQuery } from './transform/query';
import { pickSelectionParams } from './params';
import { applyTransforms } from './attributes';
import { clearTransformDataRequestCache, transformData } from './transform/data';

/**
 * Reads and validates the `api.documents.strictRelations` flag.
 * false/undefined => legacy behaviour (relational required constraints not enforced),
 * true => enforce required media and relations on non-draft writes.
 * Mirrors the validation of `api.documents.strictParams` (see repository.ts).
 */
const isStrictRelationsEnabled = (): boolean => {
  const rawStrictRelations: unknown = strapi.config.get('api.documents.strictRelations', undefined);

  if (
    rawStrictRelations !== undefined &&
    rawStrictRelations !== false &&
    rawStrictRelations !== true
  ) {
    throw new errors.ValidationError(
      `Invalid config.api.documents.strictRelations value: "${rawStrictRelations}". Expected boolean (true or false).`
    );
  }

  return rawStrictRelations === true;
};

const createEntriesService = (
  uid: UID.ContentType,
  entityValidator: Modules.EntityValidator.EntityValidator
) => {
  const contentType = strapi.contentType(uid);

  const removeNilDocumentId = (data: any) => {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (data.documentId !== null && data.documentId !== undefined) {
      return data;
    }

    return omit('documentId', data);
  };

  const assignGeneratedDocumentId = (data: any) => {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (data.documentId !== null && data.documentId !== undefined) {
      return data;
    }

    return assoc('documentId', createDocumentId(), data);
  };

  async function createEntry(params = {} as any) {
    const { data: transformedData, ...restParams } = await transformParamsDocumentId(uid, params);
    const data = removeNilDocumentId(transformedData);
    const query = transformParamsToQuery(uid, pickSelectionParams(restParams) as any); // select / populate

    // Validation
    if (!data) {
      throw new Error('Create requires data attribute');
    }

    // Check for uniqueness based on documentId and locale (if localized)
    if (data.documentId) {
      const i18nService = strapi.plugin('i18n')?.service('content-types');
      const isLocalized = i18nService?.isLocalizedContentType(contentType) ?? false;
      const hasDraftAndPublish = contentType.options?.draftAndPublish === true;

      const whereClause: Record<string, unknown> = { documentId: data.documentId };

      if (isLocalized) {
        whereClause.locale = data.locale;
      }

      let publishedStateDescription = '';

      if (hasDraftAndPublish) {
        if (data.publishedAt) {
          // Current entry is published, check for existing published entry
          whereClause.publishedAt = { $notNull: true };
          publishedStateDescription = 'published';
        } else {
          // Current entry is a draft, check for existing draft entry
          whereClause.publishedAt = { $null: true };
          publishedStateDescription = 'draft';
        }
      }

      const existingEntry = await strapi.db.query(uid).findOne({
        select: ['id'],
        where: whereClause,
      });

      if (existingEntry) {
        let errorMsg = `A ${publishedStateDescription} entry with documentId "${data.documentId}"`;
        if (isLocalized && data.locale) {
          errorMsg += ` and locale "${data.locale}"`;
        }
        errorMsg += ` already exists for UID "${uid}". This combination must be unique.`;
        throw new errors.ApplicationError(errorMsg);
      }
    }

    const dataWithDocumentId = assignGeneratedDocumentId(data);

    const validData = await entityValidator.validateEntityCreation(
      contentType,
      dataWithDocumentId,
      {
        // Note: publishedAt value will always be set when DP is disabled
        isDraft: !params?.data?.publishedAt,
        locale: params?.locale,
        strictRelations: isStrictRelationsEnabled(),
      }
    );

    // Component handling
    const componentData = await components.createComponents(uid, validData);
    const dataWithComponents = components.assignComponentData(
      contentType,
      componentData,
      validData
    );

    const entryData = applyTransforms(contentType, dataWithComponents);

    const doc = await strapi.db.query(uid).create({ ...query, data: entryData });

    return doc;
  }

  async function deleteEntry(id: number, query = {} as any) {
    const componentsToDelete = await components.getComponents(uid, { id });

    const deletedEntry = await strapi.db.query(uid).delete({ ...query, where: { id } });

    await components.deleteComponents(uid, componentsToDelete as any, { loadComponents: false });

    return deletedEntry;
  }

  async function updateEntry(entryToUpdate: any, params = {} as any) {
    const { data: transformedData, ...restParams } = await transformParamsDocumentId(uid, params);
    const data = removeNilDocumentId(transformedData);
    const query = transformParamsToQuery(uid, pickSelectionParams(restParams) as any); // select / populate

    const validData = await entityValidator.validateEntityUpdate(
      contentType,
      data,
      {
        isDraft: !params?.data?.publishedAt, // Always update the draft version
        locale: params?.locale,
        strictRelations: isStrictRelationsEnabled(),
      },
      entryToUpdate
    );
    // Component handling
    const componentData = await components.updateComponents(uid, entryToUpdate, validData as any);
    const dataWithComponents = components.assignComponentData(
      contentType,
      componentData,
      validData
    );

    const entryData = applyTransforms(contentType, dataWithComponents);

    return strapi.db
      .query(uid)
      .update({ ...query, where: { id: entryToUpdate.id }, data: entryData });
  }

  async function publishEntry(entry: any, params = {} as any) {
    clearTransformDataRequestCache();

    return async.pipe(
      omit('id'),
      assoc('publishedAt', new Date()),
      (draft) => {
        const opts = {
          uid,
          locale: draft.locale,
          status: 'published',
          allowMissingId: true,
          useRequestCache: false,
        };
        return transformData(draft, opts);
      },
      // Create the published entry
      (draft) => createEntry({ ...params, data: draft, locale: draft.locale, status: 'published' })
    )(entry);
  }

  async function discardDraftEntry(entry: any, params = {} as any) {
    clearTransformDataRequestCache();

    return async.pipe(
      omit('id'),
      assoc('publishedAt', null),
      (entry) => {
        const opts = {
          uid,
          locale: entry.locale,
          status: 'draft',
          allowMissingId: true,
          useRequestCache: false,
        };
        return transformData(entry, opts);
      },
      // Create the draft entry
      (data) => createEntry({ ...params, locale: data.locale, data, status: 'draft' })
    )(entry);
  }

  return {
    create: createEntry,
    delete: deleteEntry,
    update: updateEntry,
    publish: publishEntry,
    discardDraft: discardDraftEntry,
  };
};

export { createEntriesService };
