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
        // TODO: to save the time from a server restart, add these components directly inside the with-admin dataset and remove this
        await addAttributesToContentType(page, 'Article', [
          {
            type: 'text',
            name: 'testtext',
            advanced: { required: true, regexp: '^(?!.*fail).*' },
          },
          {
            type: 'component',
            name: 'testrepeatablecomp',
            component: {
              options: {
                repeatable: true,
                name: 'testrepeatablecomp2',
                icon: 'moon',
                categorySelect: 'product',
                attributes: [
                  {
                    type: 'text',
                    name: 'testrepeatablecomp2text',
                    advanced: { required: true, regexp: '^(?!.*fail).*' },
                  },
                ],
              },
            },
          },
          {
            type: 'component',
            name: 'testsinglecomp',
            component: {
              options: {
                repeatable: false,
                name: 'testsinglecomp2',
                icon: 'moon',
                categorySelect: 'product',
                attributes: [
                  {
                    type: 'text',
                    name: 'testsinglecomp2text',
                    advanced: { required: true, regexp: '^(?!.*fail).*' },
                  },
                ],
              },
            },
          },
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
                      name: 'testnewcomponentrepeatable',
                      icon: 'moon',
                      categorySelect: 'product',
                      attributes: [
                        {
                          type: 'text',
                          name: 'testnewcomponentexistingcategorytext',
                          advanced: { required: true },
                        },
                      ],
                    },
                  },
                },
                // Existing component with existing category
                {
                  type: 'component',
                  name: 'testexistingcomponentexistingcategory',
                  component: {
                    useExisting: 'variations',
                    options: {
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
          name: 'testtext',
          type: 'text',
          value: 'testname',
        },
      ],
      { save: true, publish: true, verify: true }
    );
  });

  test('I want to set component order when creating content', async ({ page }) => {
    await page.reload();

    const fields = [
      {
        name: 'testtext',
        type: 'text',
        value: 'testname',
      },
      {
        name: 'testdz',
        type: 'dz',
        value: [
          {
            category: 'product',
            name: 'testnewcomponentexistingcategory',
            fields: [
              {
                type: 'text',
                name: 'testnewcomponentexistingcategorytext',
                value: 'First component text value',
              },
            ],
          },
          {
            category: 'product',
            name: 'variations',
            fields: [{ type: 'text', name: 'name', value: 'Second component text value' }],
          },
        ],
      },
    ] satisfies FieldValue[];

    await createContent(page, 'Article', fields, { save: false, publish: false, verify: false });

    await page.waitForLoadState('networkidle');

    const source = page.locator('li:has-text("variations")');
    const target = page.locator('li:has-text("testnewcomponentexistingcategory")');
    await dragElementAbove(page, {
      source,
      target,
    });

    // Save and verify fields exist
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved Document');
    await verifyFields(page, fields);

    // verify order of components
    const before = await isElementBefore(source, target);
    expect(before).toBe(true);
  });

  test('when I publish an empty required text field (basic) I see an error', async ({ page }) => {
    const fields = [
      {
        name: 'testtext',
        type: 'text',
        value: '',
      },
      // publish button doesn't show up until the first field is filled
      {
        name: 'testdz',
        type: 'dz',
        value: [
          {
            category: 'product',
            name: 'newcomponentexistingcategory',
            fields: [
              {
                type: 'text',
                name: 'testnewcomponentexistingcategorytext',
                value: 'some value',
              },
            ],
          },
        ],
      },
    ] satisfies FieldValue[];

    await createContent(page, 'Article', fields, { save: false, publish: true, verify: false });

    expect(page.getByText('This value is required')).toBeVisible();
  });

  test('when I publish an invalid regexp text field (basic) I see an error', async ({ page }) => {
    const fields = [
      {
        name: 'testtext',
        type: 'text',
        value: 'this should fail',
      },
      // publish button doesn't show up until the first field is filled
      {
        name: 'testdz',
        type: 'dz',
        value: [
          {
            category: 'product',
            name: 'newcomponentexistingcategory',
            fields: [
              {
                type: 'text',
                name: 'testnewcomponentexistingcategorytext',
                value: 'some value',
              },
            ],
          },
        ],
      },
    ] satisfies FieldValue[];

    await createContent(page, 'Article', fields, { save: false, publish: true, verify: false });

    expect(page.getByText('The value does not match the regex')).toBeVisible();
  });

  // TODO: can this become a loop to test every field? might work best to have a create where every first attempt to enter an attribute is made without a name
  test('when I publish an empty required text field inside a dz I see an error', async ({
    page,
  }) => {
    const fields = [
      {
        name: 'testtext',
        type: 'text',
        value: 'some text',
      },
      {
        name: 'testdz',
        type: 'dz',
        value: [
          {
            category: 'product',
            name: 'newcomponentexistingcategory',
            fields: [
              {
                type: 'text',
                name: 'testnewcomponentexistingcategorytext',
                value: '',
              },
            ],
          },
        ],
      },
    ] satisfies FieldValue[];

    await createContent(page, 'Article', fields, { save: false, publish: true, verify: false });

    // TODO: check that aria-invalid=true for this input

    expect(page.getByText('This value is required')).toBeVisible();
  });
});
