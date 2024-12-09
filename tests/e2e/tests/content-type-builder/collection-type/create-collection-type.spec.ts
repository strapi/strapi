import { test } from '@playwright/test';
import { resetFiles } from '../../../utils/file-reset';
import { createCollectionType, type AddAttribute } from '../../../utils/content-types';
import { sharedSetup } from '../../../utils/setup';
import { clickAndWait } from '../../../utils/shared';

test.describe('Create collection type with all field types', () => {
  // Long timeout due to server restarts
  test.describe.configure({ timeout: 300000 });

  test.beforeEach(async ({ page }) => {
    await sharedSetup('ctb-edit-st', page, {
      login: true,
      skipTour: true,
      resetFiles: true,
      importData: 'with-admin.tar',
    });

    await clickAndWait(page, page.getByRole('link', { name: 'Content-Type Builder' }));
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test('Can create a collection type with all field types (except relations)', async ({ page }) => {
    const attributes: AddAttribute[] = [
      { type: 'text', name: 'testtext' },
      { type: 'boolean', name: 'testboolean' },
      { type: 'blocks', name: 'testblocks' },
      { type: 'json', name: 'testjson' },
      { type: 'number', name: 'testinteger', number: { format: 'integer' } },
      { type: 'number', name: 'testbiginteger', number: { format: 'big integer' } },
      { type: 'number', name: 'testdecimal', number: { format: 'decimal' } },
      { type: 'email', name: 'testemail' },
      { type: 'date', name: 'testdateonlydate', date: { format: 'date' } },
      { type: 'date', name: 'testdatetime', date: { format: 'time' } },
      { type: 'date', name: 'testdatedatetime', date: { format: 'datetime' } },
      { type: 'password', name: 'testpassword' },
      { type: 'media', name: 'testmediasingle', media: { multiple: false } },
      { type: 'media', name: 'testmediamultiple', media: { multiple: true } },
      {
        type: 'enumeration',
        name: 'testenumeration',
        enumeration: { values: ['first', 'second', 'third'] },
      },
      { type: 'markdown', name: 'testmarkdown' },
      // New single component with a new category
      {
        type: 'component',
        name: 'testnewcomponentnewcategory',
        component: {
          options: {
            repeatable: false,
            name: 'testnewcomponentnewcategory',
            icon: 'alien',
            categoryCreate: 'testcategory',
            attributes: [{ type: 'text', name: 'testcompotext' }],
          },
        },
      },
      // New repeatable component with existing category
      {
        type: 'component',
        name: 'testnewcomponentexistingcategory',
        component: {
          options: {
            repeatable: true,
            name: 'testnewcomponentrepeatable',
            icon: 'moon',
            categorySelect: 'testcategory',
            attributes: [{ type: 'text', name: 'testcompotext' }],
          },
        },
      },
      // Existing component with existing category
      {
        type: 'component',
        name: 'testexistingcomponentexistingcategory',
        component: {
          useExisting: 'testnewcomponentnewcategory',
          options: {
            repeatable: false,
            name: 'testexistingcomponent',
            icon: 'globe',
            categorySelect: 'testcategory',
          },
        },
      },
      // Dynamic zone
      {
        type: 'dz',
        name: 'testdynamiczone',
        dz: {
          options: {},
          components: [
            {
              type: 'component',
              name: 'testdznewcomponentnewcategory',
              component: {
                options: {
                  repeatable: false,
                  name: 'testnewcomponentnewcategory',
                  icon: 'paint',
                  categoryCreate: 'testcategory',
                  attributes: [{ type: 'text', name: 'testcompotext' }],
                },
              },
            },
          ],
        },
      },
    ];

    const options = {
      name: 'Secret Document',
      singularId: 'secret-document',
      pluralId: 'secret-documents',
      attributes,
    };

    await createCollectionType(page, options);
  });
});
