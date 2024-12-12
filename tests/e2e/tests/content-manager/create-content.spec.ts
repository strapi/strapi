import { test } from '@playwright/test';
import { addAttributesToContentType } from '../../utils/content-types';
import { sharedSetup } from '../../utils/setup';
import { clickAndWait, navToHeader } from '../../utils/shared';
import { createContent } from '../../utils/content-creation';
import { resetFiles } from '../../utils/file-reset';

test.describe('Adding content', () => {
  test.beforeEach(async ({ page }) => {
    await sharedSetup('ctb-edit-st', page, {
      login: true,
      skipTour: true,
      resetFiles: true,
      importData: 'with-admin.tar',
      afterSetup: async ({ page }) => {
        // TODO: to save the time from a server restart, add these components directly inside the with-admin dataset
        await addAttributesToContentType(page, 'Article', [
          {
            type: 'dz',
            name: 'testdz',
            dz: {
              components: [
                // New repeatable component with existing category
                {
                  type: 'component',
                  name: 'testnewcomponentexistingcategory',
                  component: {
                    options: {
                      repeatable: true,
                      name: 'testnewcomponentrepeatable',
                      icon: 'moon',
                      categoryCreate: 'testcategory',
                      attributes: [{ type: 'text', name: 'testnewcompotext' }],
                    },
                  },
                },
                // NOTE:
                // Existing component with existing category
                {
                  type: 'component',
                  name: 'testexistingcomponentexistingcategory',
                  component: {
                    useExisting: 'variations',
                    options: {
                      repeatable: false,
                      name: 'testvariations',
                      icon: 'globe',
                      categorySelect: 'testcategory',
                    },
                  },
                },
              ],
            },
          },
        ]);
      },
    });

    await clickAndWait(page, page.getByRole('link', { name: 'Content-Type Builder' }));
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test('as a user I want to be able to create content ', async ({ page }) => {
    await createContent(page, 'Article', [
      {
        name: 'testdz',
        type: 'dz',
        value: [
          {
            category: 'testcategory',
            name: 'testnewcomponentexistingcategory',
            fields: [
              { type: 'text', name: 'testnewcompotext', value: 'First component text value' },
            ],
          },
          {
            category: 'testcategory',
            name: 'testexistingcomponentexistingcategory',
            fields: [
              { type: 'text', name: 'testexistingcompotext', value: 'Second component text value' },
            ],
          },
        ],
      },
      {
        name: 'title',
        type: 'text',
        value: 'testname',
      },
    ]);
  });
});
