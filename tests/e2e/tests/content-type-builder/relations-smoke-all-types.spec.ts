import { test, expect } from '@playwright/test';
import { resetFiles } from '../../../utils/file-reset';
import { sharedSetup } from '../../../utils/setup';
import { createCollectionType, type AddAttribute } from '../../../utils/content-types';
import { clickAndWait, findAndClose, navToHeader } from '../../../utils/shared';

// Critical path #11 — relations.smoke-all-types
//
// One smoke per relation type. Creates a collection type carrying every relation type
// (oneWay / oneToOne / oneToMany / manyToOne / manyToMany / manyWay) in a single CTB save, then
// verifies each one renders in the Content Manager editor and that a relation can actually be
// connected and persisted. (CTB-side creation of all types is already covered by
// create-collection-type.spec.ts; this closes the Content-Manager side.)
const CT_NAME = 'Relsmoke';
const RELATION_FIELDS = [
  'relOneWay',
  'relOneToOne',
  'relOneToMany',
  'relManyToOne',
  'relManyToMany',
  'relManyWay',
] as const;

test.describe('Relations - smoke all relation types in the editor', { tag: ['@critical'] }, () => {
  // Long timeout — creating the content type restarts the server
  test.describe.configure({ timeout: 500000 });

  test.beforeEach(async ({ page }) => {
    await sharedSetup('relations-smoke-all-types', page, {
      login: true,
      resetFiles: true,
      importData: 'with-admin',
      resetAlways: true,
    });
    await clickAndWait(page, page.getByRole('link', { name: 'Content-Type Builder' }));
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test('every relation type renders in the editor and can be connected', async ({ page }) => {
    // Build one CT with all six relation types (all targeting the seeded Article). A trailing text
    // field keeps a relation from being the last attribute (relations self-submit on Finish).
    const attributes: AddAttribute[] = [
      { type: 'text', name: 'title' },
      {
        type: 'relation',
        name: 'relOneWay',
        relation: { type: 'oneWay', target: { select: 'Article', name: 'rsOneWay' } },
      },
      {
        type: 'relation',
        name: 'relOneToOne',
        relation: { type: 'oneToOne', target: { select: 'Article', name: 'rsOneToOne' } },
      },
      {
        type: 'relation',
        name: 'relOneToMany',
        relation: { type: 'oneToMany', target: { select: 'Article', name: 'rsOneToMany' } },
      },
      {
        type: 'relation',
        name: 'relManyToOne',
        relation: { type: 'manyToOne', target: { select: 'Article', name: 'rsManyToOne' } },
      },
      {
        type: 'relation',
        name: 'relManyToMany',
        relation: { type: 'manyToMany', target: { select: 'Article', name: 'rsManyToMany' } },
      },
      {
        type: 'relation',
        name: 'relManyWay',
        relation: { type: 'manyWay', target: { select: 'Article', name: 'rsManyWay' } },
      },
      { type: 'text', name: 'note' },
    ];

    await createCollectionType(page, {
      name: CT_NAME,
      singularId: 'relsmoke',
      pluralId: 'relsmokes',
      attributes,
    });

    // Content Manager: open a fresh entry and confirm every relation type renders.
    await navToHeader(page, ['Content Manager', CT_NAME], CT_NAME);
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());
    for (const field of RELATION_FIELDS) {
      await expect(page.getByRole('combobox', { name: field })).toBeVisible();
    }

    // Connect a relation and confirm it persists — proves the type is usable end-to-end, not just rendered.
    await page.getByRole('combobox', { name: 'relManyWay' }).click();
    await page.getByRole('option', { name: 'West Ham post match analysis' }).click();
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved Document');
    await expect(page.getByRole('button', { name: 'West Ham post match analysis' })).toBeVisible();
  });
});
