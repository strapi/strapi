import { test } from '@playwright/test';
import { resetFiles } from '../../../utils/file-reset';
import {
  createCollectionType,
  createSingleType,
  type AddAttribute,
} from '../../../utils/content-types';
import { sharedSetup } from '../../../utils/setup';
import { clickAndWait } from '../../../utils/shared';

test.describe('Create single type with all field types', () => {
  // very long timeout for these tests because they restart the server multiple times
  test.describe.configure({ timeout: 500000 });

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

  const advancedRequired = { required: true };
  const advancedRegex = { required: true, regexp: '^(?!.*fail).*' };

  test('Can create a collection type with all field types', async ({ page }) => {
    const attributes: AddAttribute[] = [
      { type: 'text', name: 'testtext', advanced: advancedRegex },
      { type: 'boolean', name: 'testboolean', advanced: advancedRequired },
      { type: 'blocks', name: 'testblocks', advanced: advancedRequired },
      { type: 'json', name: 'testjson', advanced: advancedRequired },
      {
        type: 'number',
        name: 'testinteger',
        number: { format: 'integer' },
        advanced: advancedRequired,
      },
      {
        type: 'number',
        name: 'testbiginteger',
        number: { format: 'big integer' },
        advanced: advancedRequired,
      },
      {
        type: 'number',
        name: 'testdecimal',
        number: { format: 'decimal' },
        advanced: advancedRequired,
      },
      { type: 'email', name: 'testemail', advanced: advancedRequired },
      {
        type: 'date',
        name: 'testdateonlydate',
        date: { format: 'date' },
        advanced: advancedRequired,
      },
      { type: 'date', name: 'testdatetime', date: { format: 'time' }, advanced: advancedRequired },
      {
        type: 'date',
        name: 'testdatedatetime',
        date: { format: 'datetime' },
        advanced: advancedRequired,
      },
      { type: 'password', name: 'testpassword', advanced: advancedRequired },
      {
        type: 'media',
        name: 'testmediasingle',
        media: { multiple: false },
        advanced: advancedRequired,
      },
      {
        type: 'media',
        name: 'testmediamultiple',
        media: { multiple: true },
        advanced: advancedRequired,
      },
      {
        type: 'relation',
        name: 'testonewayrelation',
        relation: {
          type: 'oneWay',
          target: { select: 'Article', name: 'testonewayrelationtarget' },
        },
        advanced: advancedRequired,
      },
      {
        type: 'relation',
        name: 'testmanywayrelation',
        relation: {
          type: 'manyWay',
          target: { select: 'Article', name: 'testmanywayrelationtarget' },
        },
        advanced: advancedRequired,
      },
      {
        type: 'enumeration',
        name: 'testenumeration',
        enumeration: { values: ['first', 'second', 'third'] },
        advanced: advancedRequired,
      },
      { type: 'markdown', name: 'testmarkdown', advanced: advancedRequired },
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
            attributes: [
              {
                type: 'text',
                name: 'testnewcompotext',
                advanced: { required: true, regexp: '^(?!.*fail).*' },
              },
            ],
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
            attributes: [
              {
                type: 'text',
                name: 'testexistingcompotext',
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
                  attributes: [
                    {
                      type: 'text',
                      name: 'testdzcompotext',
                      advanced: { required: true, regexp: '^(?!.*fail).*' },
                    },
                  ],
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
      attributes,
    };

    await createSingleType(page, options);
  });
});
