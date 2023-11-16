import { Documents } from '@strapi/types';
import { defaultToDraft, statusToLookup, statusToData } from './draft-and-publish';
import { defaultLocale, localeToLookup, localeToData } from './locales';

export const loadDefaultMiddlewares = (manager: Documents.Middleware.Manager) => {
  // Find Many
  manager.add(
    'allUIDs',
    'findMany',
    [defaultToDraft, statusToLookup, defaultLocale, localeToLookup],
    {}
  );

  // Find One
  manager.add(
    'allUIDs',
    'findOne',
    [defaultToDraft, statusToLookup, defaultLocale, localeToLookup],
    {}
  );

  // Find First
  manager.add(
    'allUIDs',
    'findFirst',
    [defaultToDraft, statusToLookup, defaultLocale, localeToLookup],
    {}
  );

  // Delete
  manager.add('allUIDs', 'delete', [statusToLookup, localeToLookup], {});

  // Delete Many - TODO
  // manager.add('allUIDs', 'deleteMany', [], {});

  // Create
  manager.add('allUIDs', 'create', [defaultToDraft, statusToData, defaultLocale, localeToData], {});

  // Update
  manager.add(
    'allUIDs',
    'update',
    [defaultToDraft, statusToLookup, statusToData, defaultLocale, localeToData],
    {}
  );

  // Count
  manager.add('allUIDs', 'count', [defaultToDraft, defaultLocale], {});

  // Clone
  manager.add('allUIDs', 'clone', [localeToLookup], {});

  // Publish
  manager.add('allUIDs', 'publish', defaultToDraft, {});

  // Unpublish
  manager.add('allUIDs', 'unpublish', defaultToDraft, {});
};
