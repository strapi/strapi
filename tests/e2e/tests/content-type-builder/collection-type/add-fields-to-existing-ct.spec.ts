import { test, expect } from '@playwright/test';
import { resetFiles } from '../../../../utils/file-reset';
import { sharedSetup } from '../../../../utils/setup';
import { addAttributesToContentType, type AddAttribute } from '../../../../utils/content-types';
import { clickAndWait, navToHeader } from '../../../../utils/shared';

test.describe(
  'CTB - Add component, DZ, and relation to existing CT',
  { tag: ['@critical'] },
  () => {
    // Long timeout — triggers multiple server restarts
    test.describe.configure({ timeout: 500000 });

    test.beforeEach(async ({ page }) => {
      await sharedSetup('ctb-add-fields-existing-ct', page, {
        resetFiles: true,
        importData: 'with-admin',
        login: true,
      });
    });

    test.afterAll(async () => {
      await resetFiles();
    });

    test('Adding a component, DZ, and relation to an existing CT renders them in the CM editor', async ({
      page,
    }) => {
      // Each field type is added in a separate call + restart.
      // Relations self-click Finish internally, so they cannot be the last item
      // in a multi-attribute addAttributesToContentType call.

      const component: AddAttribute = {
        type: 'component',
        name: 'testcomponent',
        component: {
          options: {
            repeatable: false,
            name: 'TestComponent',
            icon: 'alien',
            categoryCreate: 'testcategorycomp',
            attributes: [{ type: 'text', name: 'componenttext' }],
          },
        },
      };

      const relation: AddAttribute = {
        type: 'relation',
        name: 'testrelation',
        relation: {
          type: 'oneWay',
          target: { select: 'Author' },
        },
      };

      const dz: AddAttribute = {
        type: 'dz',
        name: 'testdz',
        dz: {
          components: [
            {
              type: 'component',
              name: 'TestDZComponent',
              component: {
                options: {
                  repeatable: false,
                  name: 'TestDZComponent',
                  icon: 'moon',
                  categoryCreate: 'testcategorydz',
                  attributes: [{ type: 'text', name: 'dztext' }],
                },
              },
            },
          ],
        },
      };

      await addAttributesToContentType(page, 'Article', [component]);
      await addAttributesToContentType(page, 'Article', [relation]);
      await addAttributesToContentType(page, 'Article', [dz]);

      // Navigate to CM and verify all three fields render in the edit view
      await navToHeader(page, ['Content Manager', 'Article'], 'Article');
      await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).first());

      await expect(page.getByText('testcomponent', { exact: false })).toBeVisible();
      await expect(page.getByRole('button', { name: /Add a component to testdz/i })).toBeVisible();
      await expect(page.getByRole('combobox', { name: /testrelation/i })).toBeVisible();
    });
  }
);
