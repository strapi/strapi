import type { UID, Modules } from '@strapi/types';
import { async, errors } from '@strapi/utils';
import { assoc, omit } from 'lodash/fp';

import * as components from './components';

import { transformParamsDocumentId } from './transform/id-transform';
import { transformParamsToQuery } from './transform/query';
import { pickSelectionParams } from './params';
import { applyTransforms } from './attributes';
import { transformData } from './transform/data';

const createEntriesService = (
  uid: UID.ContentType,
  entityValidator: Modules.EntityValidator.EntityValidator
) => {
  const contentType = strapi.contentType(uid);

  async function createEntry(params = {} as any) {
    const { data, ...restParams } = await transformParamsDocumentId(uid, params);
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

    const validData = await entityValidator.validateEntityCreation(contentType, data, {
      // Note: publishedAt value will always be set when DP is disabled
      isDraft: !params?.data?.publishedAt,
      locale: params?.locale,
    });

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

  async function deleteEntry(id: number) {
    const componentsToDelete = await components.getComponents(uid, { id });

    const deletedEntry = await strapi.db.query(uid).delete({ where: { id } });

    await components.deleteComponents(uid, componentsToDelete as any, { loadComponents: false });

    return deletedEntry;
  }

  async function updateEntry(entryToUpdate: any, params = {} as any) {
    const { data, ...restParams } = await transformParamsDocumentId(uid, params);
    const query = transformParamsToQuery(uid, pickSelectionParams(restParams) as any); // select / populate

    const validData = await entityValidator.validateEntityUpdate(
      contentType,
      data,
      {
        isDraft: !params?.data?.publishedAt, // Always update the draft version
        locale: params?.locale,
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
    return async.pipe(
      omit('id'),
      assoc('publishedAt', new Date()),
      (draft) => {
        const opts = { uid, locale: draft.locale, status: 'published', allowMissingId: true };
        return transformData(draft, opts);
      },
      // Create the published entry
      (draft) => createEntry({ ...params, data: draft, locale: draft.locale, status: 'published' })
    )(entry);
  }

  async function discardDraftEntry(entry: any, params = {} as any) {
    return async.pipe(
      omit('id'),
      assoc('publishedAt', null),
      (entry) => {
        const opts = { uid, locale: entry.locale, status: 'draft', allowMissingId: true };
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
