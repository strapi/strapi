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
      // {
      //   name: 'testdz',
      //   type: 'dz',
      //   value: undefined,
      // },
      {
        name: 'title',
        type: 'text',
        value: 'testname',
      },
    ]);

    // await
    // await createContent('')
    // await page.getByLabel('Content Manager').click();
    // await page.getByRole('link', { name: 'Create new entry' }).click();
    // // Wait for the URL to match the CREATE_URL pattern
    // await page.waitForURL(CREATE_URL);
    // // Add a new relation to the entry
    // await page.getByRole('combobox', { name: 'authors' }).click();
    // await page.getByLabel('Coach BeardDraft').click();
    // // Attempt to publish the entry
    // await page.getByRole('button', { name: 'Publish' }).click();
    // // Verify that a warning about a single draft relation is displayed
    // await expect(page.getByText('This entry is related to 1')).toBeVisible();
    // await page.getByRole('button', { name: 'Cancel' }).click();
    // // Save the current state of the entry
    // await page.getByRole('button', { name: 'Save' }).click();
    // await findAndClose(page, 'Saved Document');
    // // Add another relation to the entry
    // await page.getByRole('combobox', { name: 'authors' }).click();
    // await page.getByLabel('Led TassoDraft').click();
    // // Attempt to publish the entry again
    // await page.getByRole('button', { name: 'Publish' }).click();
    // // Verify that a warning about two draft relations is displayed
    // await expect(page.getByText('This entry is related to 2')).toBeVisible();
    // await page.getByRole('button', { name: 'Cancel' }).click();
    // // Save the current state of the entry
    // await page.getByRole('button', { name: 'Save' }).click();
    // await findAndClose(page, 'Saved Document');
    // // Attempt to publish the entry once more
    // await page.getByRole('button', { name: 'Publish' }).click();
    // // Verify that the warning about three draft relations is still displayed
    // await expect(page.getByText('This entry is related to 3')).toBeVisible();
  });
});
