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
                          advanced: { required: true, regexp: '^(?!.*fail).*' },
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

  const testCases = [
    // Basic type tests
    {
      description: 'empty required text field (basic)',
      fields: [
        { name: 'testtext', type: 'text', value: '' },
        { name: 'title', type: 'text', value: 'at least one field requires text' },
      ],
      expectedError: 'This value is required',
    },
    {
      description: 'invalid regexp text field (basic)',
      fields: [{ name: 'testtext', type: 'text', value: 'fail-regexp' }],
      expectedError: 'The value does not match the regex',
    },

    // Single component type tests
    {
      description: 'empty required text field (single component)',
      fields: [
        { name: 'testtext', type: 'text', value: 'fill required text' },
        {
          name: 'testsinglecomp',
          type: 'component',
          value: [
            {
              category: 'product',
              name: 'testsinglecomp',
              fields: [{ name: 'testsinglecomp2text', type: 'text', value: '' }],
            },
          ],
        },
      ],
      expectedError: 'This value is required',
    },
    {
      description: 'invalid regexp text field (single component)',
      fields: [
        { name: 'testtext', type: 'text', value: 'fill required text' },
        {
          name: 'testcomponent',
          type: 'component',
          value: [
            {
              category: 'product',
              name: 'testsinglecomp',
              fields: [{ name: 'testsinglecomp2text', type: 'text', value: 'fail regexp' }],
            },
          ],
        },
      ],
      expectedError: 'The value does not match the regex',
    },

    // repeatable component tests
    {
      description: 'empty required text field (repeatable component)',
      fields: [
        { name: 'testtext', type: 'text', value: 'fill required text' },
        {
          name: 'testrepeatablecomp',
          type: 'component_repeatable',
          value: [
            {
              category: 'product',
              name: 'testrepeatablecomp',
              fields: [{ name: 'testrepeatablecomp2text', type: 'text', value: '' }],
            },
          ],
        },
      ],
      expectedError: 'This value is required',
    },
    {
      description: 'invalid regexp text field (repeatable component)',
      fields: [
        { name: 'testtext', type: 'text', value: 'fill required text' },
        {
          name: 'testrepeatablecomp',
          type: 'component_repeatable',
          value: [
            {
              category: 'product',
              name: 'testrepeatablecomp',
              fields: [{ name: 'testrepeatablecomp2text', type: 'text', value: 'fail regexp' }],
            },
          ],
        },
      ],
      expectedError: 'The value does not match the regex',
    },

    // Dynamic Zone (dz) component tests
    {
      description: 'empty required text field (dz component)',
      fields: [
        { name: 'testtext', type: 'text', value: 'fill required text' },
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
      ],
      expectedError: 'This value is required',
    },
    {
      description: 'invalid regexp text field (dz component)',
      fields: [
        { name: 'testtext', type: 'text', value: 'fill required text' },
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
                  value: 'fail regexp',
                },
              ],
            },
          ],
        },
      ],
      expectedError: 'The value does not match the regex',
    },
  ] satisfies { description: string; fields: FieldValue[]; expectedError: string }[];

  for (const { description, fields, expectedError } of testCases) {
    test(`when I publish ${description} I see an error`, async ({ page }) => {
      await createContent(page, 'Article', fields, { save: false, publish: true, verify: false });
      expect(page.getByText(expectedError)).toBeVisible();
    });
  }
});
