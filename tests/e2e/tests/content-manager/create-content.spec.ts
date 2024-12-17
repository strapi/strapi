import { test, expect } from '@playwright/test';
import { addAttributesToContentType } from '../../utils/content-types';
import { sharedSetup } from '../../utils/setup';
import { clickAndWait, dragElementAbove, findAndClose, isElementBefore } from '../../utils/shared';
import { createContent, FieldValue, verifyFields } from '../../utils/content-creation';
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
                      categorySelect: 'product',
                      attributes: [{ type: 'text', name: 'testnewcompotext' }],
                    },
                  },
                },
                // NOTE:
                // Existing component with existing category
                {
                  type: 'component',
                  name: 'testexistingcomponentexistingcategory', // TODO: is this used?
                  component: {
                    useExisting: 'variations',
                    options: {
                      repeatable: false,
                      name: 'testvariations',
                      icon: 'globe',
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

  test('I want to be able to save and publish content', async ({ page }) => {
    await createContent(
      page,
      'Article',
      [
        {
          name: 'title',
          type: 'text',
          value: 'testname',
        },
      ],
      { save: true, publish: true, verify: true }
    );
  });

  test('I want to set component order when creating content', async ({ page }) => {
    const fields = [
      {
        name: 'testdz',
        type: 'dz',
        value: [
          {
            category: 'product',
            name: 'testnewcomponentexistingcategory',
            fields: [
              { type: 'text', name: 'testnewcompotext', value: 'First component text value' },
            ],
          },
          {
            category: 'product',
            name: 'variations',
            fields: [{ type: 'text', name: 'name', value: 'Second component text value' }],
          },
        ],
      },
      {
        name: 'title',
        type: 'text',
        value: 'testname',
      },
    ] satisfies FieldValue[];

    await createContent(page, 'Article', fields, { save: false, publish: false, verify: false });

    const source = page.locator('li:has-text("variations")');
    const target = page.locator('li:has-text("testnewcomponentexistingcategory")');
    await dragElementAbove(page, {
      source,
      target,
      resizeHeight: 2000,
    });

    // Save and verify fields exist
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved Document');
    await verifyFields(page, fields);

    // verify order of components
    const before = await isElementBefore(source, target);
    expect(before).toBe(true);
  });
});
