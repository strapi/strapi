import { scaffoldContentType, type App } from '@strapi/tests-shared';

/**
 * The content types of the ui app, written before any server boots, so the database snapshot,
 * the default roles (Editor, Author) and their permissions already include them.
 *
 * Kept small: add a content type when a migrated spec needs one. Scaffolding is idempotent and
 * runs on every global setup, so a reused app picks up a new content type. Removing one leaves
 * its files in a reused app: run once with TESTS_REGENERATE=true.
 */
export const scaffoldUiSchema = (app: App) => {
  // Settings > Roles: the permission matrix of the role specs (Read, Update, Delete, Publish).
  scaffoldContentType(app, {
    singularName: 'article',
    draftAndPublish: true,
    attributes: { title: { type: 'string' } },
  });

  // Content Manager: validation of required fields on save.
  scaffoldContentType(app, {
    singularName: 'product',
    attributes: {
      name: { type: 'string', required: true },
      price: { type: 'decimal', required: true },
    },
  });
};
