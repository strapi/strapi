import { test } from '@playwright/test';
import { resetFiles } from '../../../utils/file-reset';
import { createCollectionType, type AddAttribute } from '../../../utils/content-types';
import { sharedSetup } from '../../../utils/setup';
import { clickAndWait } from '../../../utils/shared';

test.describe('Create collection type with all field types', () => {
  // very long timeout for these tests because they restart the server multiple times
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

  // TODO: each test should have a beforeAll that does this, maybe combine all the setup into one util to simplify it
  // to keep other suites that don't modify files from needing to reset files, clean up after ourselves at the end
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
            attributes: [{ type: 'text', name: 'testnewcompotext' }],
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
            attributes: [{ type: 'text', name: 'testexistingcompotext' }],
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
                  attributes: [{ type: 'text', name: 'testdzcompotext' }],
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
