import { scaffoldContentType, type App, type ContentTypeDefinition } from '@strapi/tests-shared';

/**
 * The content types of the ui app, written before any server boots, so the database snapshot,
 * the default roles (Editor, Author) and their permissions already include them.
 *
 * Kept small: add a content type when a migrated or generated spec needs one, as an entry of this
 * list (`tests/app/lifecycle.ui-test.ts` checks the app has these and no other). Scaffolding is
 * idempotent and runs on every global setup, so a reused app picks up a new content type.
 * Removing one leaves its files in a reused app: run once with TESTS_REGENERATE=true.
 */
export const UI_CONTENT_TYPES: ContentTypeDefinition[] = [
  // Settings > Roles: the permission matrix of the role specs (Read, Update, Delete, Publish).
  {
    singularName: 'article',
    draftAndPublish: true,
    attributes: { title: { type: 'string' } },
  },
  // Content Manager: validation of required fields on save.
  {
    singularName: 'product',
    attributes: {
      name: { type: 'string', required: true },
      price: { type: 'decimal', required: true },
    },
  },
];

export const scaffoldUiSchema = (app: App) => {
  for (const definition of UI_CONTENT_TYPES) scaffoldContentType(app, definition);
};
