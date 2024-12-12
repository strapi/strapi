import { test } from '@playwright/test';
import { addAttributesToContentType } from '../../utils/content-types';
import { sharedSetup } from '../../utils/setup';
import { clickAndWait } from '../../utils/shared';
import { createContent } from '../../utils/content-creation';
import { resetFiles } from '../../utils/file-reset';

test.describe('Adding content', () => {
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

  test('as a user I want to be able to create content ', async ({ page }) => {
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
                  attributes: [{ type: 'text', name: 'testcompotext' }],
                },
              },
            },
            // Existing component with existing category
            {
              type: 'component',
              name: 'testexistingcomponentexistingcategory',
              component: {
                useExisting: 'testnewcomponentexistingcategory',
                options: {
                  repeatable: false,
                  name: 'testexistingcomponent',
                  icon: 'globe',
                  categorySelect: 'testcategory',
                },
              },
            },
          ],
        },
      },
    ]);

    // Add the content
    await createContent(page, 'Article', [
      {
        name: 'title',
        type: 'text',
        value: 'testname',
      },
    ]);
  });
});
