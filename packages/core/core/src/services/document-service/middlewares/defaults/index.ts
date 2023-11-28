import { Documents } from '@strapi/types';
import DP from './draft-and-publish';
import i18n from './locales';

export const loadDefaultMiddlewares = (manager: Documents.Middleware.Manager) => {
  // Find Many
  manager.add(
    '_all',
    'findMany',
    [DP.defaultToDraft, DP.statusToLookup, i18n.defaultLocale, i18n.localeToLookup],
    {}
  );

  // Find One
  manager.add(
    '_all',
    'findOne',
    [DP.defaultToDraft, DP.statusToLookup, i18n.defaultLocale, i18n.localeToLookup],
    {}
  );

  // Find First
  manager.add(
    '_all',
    'findFirst',
    [DP.defaultToDraft, DP.statusToLookup, i18n.defaultLocale, i18n.localeToLookup],
    {}
  );

  // Delete
  manager.add(
    '_all',
    'delete',
    [
      // Lookup for status and locale if provided
      DP.statusToLookup,
      i18n.localeToLookup,
    ],
    {}
  );

  // Delete Many - TODO
  // manager.add('_all', 'deleteMany', [], {});

  // Create
  manager.add(
    '_all',
    'create',
    [
      // Only create drafts
      DP.setStatusToDraft,
      DP.statusToData,
      i18n.defaultLocale,
      i18n.localeToData,
    ],
    {}
  );

  // Update
  manager.add(
    '_all',
    'update',
    [
      // Only update drafts
      DP.setStatusToDraft,
      DP.statusToLookup,
      DP.statusToData,
      // Default locale will be set if not provided
      i18n.defaultLocale,
      i18n.localeToLookup,
      i18n.localeToData,
    ],
    {}
  );

  // Upsert locale if doesn't exist on update
  manager.add('_all', 'update', async (ctx, next) => {
    // Try to update
    const res = await next(ctx);

    // @ts-expect-error - TODO: Fix typings
    const docId: string = ctx.options.id;

    // If result is null, no locale has been found, so create it
    if (!res && docId) {
      const documentExists = await strapi.documents(ctx.uid).findOne(docId);
      if (documentExists) {
        return strapi.documents(ctx.uid).create({
          ...ctx.params,
          data: { ...ctx.params.data, documentId: docId },
        });
      }
    }

    return res;
  });

  // Count
  manager.add('_all', 'count', [DP.defaultToDraft, i18n.defaultLocale], {});

  // Clone
  manager.add('_all', 'clone', [i18n.localeToLookup], {});

  // Publish
  manager.add('_all', 'publish', [i18n.localeToLookup], {});

  // Unpublish
  manager.add('_all', 'unpublish', [i18n.localeToLookup], {});

  // Discard Draft
  manager.add('_all', 'discardDraft', [i18n.localeToLookup], {});
};
