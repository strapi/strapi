import { test, expect } from '@playwright/test';
import { clickAndWait, dragElementAbove, findAndClose, isElementBefore } from '../../utils/shared';
import { createContent, FieldValue, verifyFields } from '../../utils/content-creation';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { login } from '../../utils/login';

test.describe('Adding content', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });

    // Navigate to Content Manager
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
  });

  test('I want to be able to save and publish content', async ({ page }) => {
    await createContent(
      page,
      'Match',
      [
        {
          name: 'opponent*',
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
        name: 'opponent*',
        type: 'text',
        value: 'testname',
      },
      {
        name: 'sections',
        type: 'dz',
        value: [
          {
            category: 'match',
            name: 'player',
            fields: [
              {
                type: 'text',
                name: 'full_name*',
                value: 'Roy Kent',
              },
            ],
          },
          {
            category: 'product',
            name: 'variations',
            fields: [{ type: 'text', name: 'name', value: 'Roy Kent Shirt Jersey' }],
          },
        ],
      },
    ] satisfies FieldValue[];

    await createContent(page, 'Match', fields, { save: false, publish: false, verify: false });

    await page.waitForLoadState('networkidle');

    const source = page.locator('li:has-text("variations")');
    const target = page.locator('li:has-text("player")');
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
        { name: 'opponent*', type: 'text', value: '' },
        { name: 'kit_man', type: 'text', value: 'Roy Kent' },
      ],
      expectedError: 'This value is required',
    },
    {
      description: 'invalid regexp text field (basic)',
      // Regex tests that richmond is not the opponent*
      fields: [{ name: 'opponent*', type: 'text', value: 'richmond' }],
      expectedError: 'The value does not match the regex',
    },

    // Single component type tests
    {
      description: 'empty required text field (single component)',
      fields: [
        {
          name: 'most_valuable_player',
          type: 'component',
          value: [
            {
              category: 'match',
              name: 'player',
              fields: [{ name: 'name', type: 'text', value: '' }],
            },
          ],
        },
        { name: 'opponent*', type: 'text', value: 'West Ham' },
      ],
      expectedError: 'This value is required',
    },
    {
      description: 'invalid regexp text field (single component)',
      fields: [
        {
          name: 'most_valuable_player',
          type: 'component',
          value: [
            {
              category: 'match',
              name: 'player',
              // Regex tests that nate is not the name
              fields: [{ name: 'full_name*', type: 'text', value: 'nate' }],
            },
          ],
        },
        { name: 'opponent*', type: 'text', value: 'West Ham' },
      ],
      expectedError: 'The value does not match the regex',
    },

    // repeatable component tests
    {
      description: 'empty required text field (repeatable component)',
      fields: [
        {
          name: 'lineup',
          type: 'component_repeatable',
          value: [
            {
              category: 'match',
              name: 'player',
              fields: [{ name: 'full_name*', type: 'text', value: '' }],
            },
          ],
        },
        { name: 'opponent*', type: 'text', value: 'West Ham' },
      ],
      expectedError: 'This value is required',
    },
    {
      description: 'invalid regexp text field (repeatable component)',
      fields: [
        {
          name: 'lineup',
          type: 'component_repeatable',
          value: [
            {
              category: 'match',
              name: 'player',
              // Regex tests that nate is not the name
              fields: [{ name: 'full_name*', type: 'text', value: 'nate' }],
            },
          ],
        },
        { name: 'opponent*', type: 'text', value: 'West Ham' },
      ],
      expectedError: 'The value does not match the regex',
    },

    // Dynamic Zone (dz) component tests
    {
      description: 'empty required text field (dz component)',
      fields: [
        {
          name: 'sections',
          type: 'dz',
          value: [
            {
              category: 'match',
              name: 'player',
              fields: [
                {
                  type: 'text',
                  name: 'full_name*',
                  value: '',
                },
              ],
            },
          ],
        },
        { name: 'opponent*', type: 'text', value: 'West Ham' },
      ],
      expectedError: 'This value is required',
    },
    {
      description: 'invalid regexp text field (dz component)',
      fields: [
        {
          name: 'sections',
          type: 'dz',
          value: [
            {
              category: 'match',
              name: 'player',
              fields: [
                {
                  type: 'text',
                  name: 'full_name*',
                  value: 'nate',
                },
              ],
            },
          ],
        },
        { name: 'opponent*', type: 'text', value: 'West Ham' },
      ],
      expectedError: 'The value does not match the regex',
    },
  ] satisfies { description: string; fields: FieldValue[]; expectedError: string }[];

  for (const { description, fields, expectedError } of testCases) {
    test(`when I publish ${description} I see an error`, async ({ page }) => {
      await createContent(page, 'Match', fields, { save: false, publish: true, verify: false });
      expect(page.getByText(expectedError)).toBeVisible();
    });
  }
});
