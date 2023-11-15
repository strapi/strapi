import { Documents } from '@strapi/types';
import { defaultToDraft, lookUpDocumentStatus, statusToData } from './draft-and-publish';
import { defaultLocale, lookUpDocumentLocale, localeToData } from './locales';

export const loadDefaultMiddlewares = (manager: Documents.Middleware.Manager) => {
  // Find Many
  manager.add(
    'allUIDs',
    'findMany',
    [defaultToDraft, lookUpDocumentStatus, defaultLocale, lookUpDocumentLocale],
    {}
  );

  // Find One
  manager.add(
    'allUIDs',
    'findOne',
    [defaultToDraft, lookUpDocumentStatus, defaultLocale, lookUpDocumentLocale],
    {}
  );

  // Find First
  manager.add(
    'allUIDs',
    'findFirst',
    [defaultToDraft, lookUpDocumentStatus, defaultLocale, lookUpDocumentLocale],
    {}
  );

  // Delete
  manager.add('allUIDs', 'delete', [lookUpDocumentStatus, lookUpDocumentLocale], {});

  // Delete Many - TODO
  // manager.add('allUIDs', 'deleteMany', [], {});

  // Create
  manager.add('allUIDs', 'create', [defaultToDraft, statusToData, defaultLocale, localeToData], {});

  // Update
  manager.add(
    'allUIDs',
    'update',
    [
      defaultToDraft,
      lookUpDocumentStatus,
      statusToData,
      defaultLocale,
      // lookUpDocumentLocale,
      localeToData,
    ],
    {}
  );

  // Count
  manager.add('allUIDs', 'count', [defaultToDraft, defaultLocale], {});

  // Clone
  manager.add('allUIDs', 'clone', defaultToDraft, {});

  // Publish
  manager.add('allUIDs', 'publish', defaultToDraft, {});

  // Unpublish
  manager.add('allUIDs', 'unpublish', defaultToDraft, {});
};
