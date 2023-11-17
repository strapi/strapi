import { Documents } from '@strapi/types';
import { defaultToDraft, statusToLookup, statusToData } from './draft-and-publish';
import { defaultLocale, localeToLookup, localeToData } from './locales';

export const loadDefaultMiddlewares = (manager: Documents.Middleware.Manager) => {
  // Find Many
  manager.add(
    '_all',
    'findMany',
    [defaultToDraft, statusToLookup, defaultLocale, localeToLookup],
    {}
  );

  // Find One
  manager.add(
    '_all',
    'findOne',
    [defaultToDraft, statusToLookup, defaultLocale, localeToLookup],
    {}
  );

  // Find First
  manager.add(
    '_all',
    'findFirst',
    [defaultToDraft, statusToLookup, defaultLocale, localeToLookup],
    {}
  );

  // Delete
  manager.add('_all', 'delete', [statusToLookup, localeToLookup], {});

  // Delete Many - TODO
  // manager.add('_all', 'deleteMany', [], {});

  // Create
  manager.add('_all', 'create', [defaultToDraft, statusToData, defaultLocale, localeToData], {});

  // Update
  manager.add(
    '_all',
    'update',
    [defaultToDraft, statusToLookup, statusToData, defaultLocale, localeToLookup, localeToData],
    {}
  );

  // Upsert locale
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
  manager.add('_all', 'count', [defaultToDraft, defaultLocale], {});

  // Clone
  manager.add('_all', 'clone', [localeToLookup], {});

  // Publish
  manager.add('_all', 'publish', [localeToLookup], {});

  // Unpublish
  manager.add('_all', 'unpublish', [localeToLookup], {});
};
