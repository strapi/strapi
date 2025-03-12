import { test } from '@playwright/test';
import { resetFiles } from '../../../utils/file-reset';
import { sharedSetup } from '../../../utils/setup';
import { createComponent, type AddAttribute } from '../../../utils/content-types';

test.describe('Create a new component', () => {
  // very long timeout for these tests because they restart the server multiple times
  test.describe.configure({ timeout: 300000 });

  test.beforeEach(async ({ page }) => {
    await sharedSetup('create-component', page, {
      resetFiles: true,
      importData: 'with-admin.tar',
      login: true,
      skipTour: true,
      afterSetup: async () => {},
    });
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test('Can create a component with a new category', async ({ page }) => {
    const options = {
      name: 'TestNewComponent',
      categoryCreate: 'BlogPosts',
      icon: 'paint',
      attributes: [
        {
          type: 'text',
          name: 'sometextfield',
        },
      ],
    };

    await createComponent(page, options);
  });

  test('Can create a component with every attribute type permutation (except relations)', async ({
    page,
  }) => {
    const attributes = [
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
      // new single component with new category
      {
        type: 'component',
        name: 'testnewcomponentnewcategory',
        component: {
          options: {
            repeatable: false,
            name: 'testnewcomponent2',
            icon: 'alien',
            categoryCreate: 'testcategory',
            attributes: [{ type: 'text', name: 'testnewcompotext' }],
          },
        },
      },
      // new repeatable component with existing category
      {
        type: 'component',
        name: 'testnewcomponentexistingcategory',
        component: {
          options: {
            repeatable: true,
            name: 'testnewcomponent3',
            icon: 'moon',
            categorySelect: 'testcategory',
            attributes: [{ type: 'text', name: 'testexistingcompotext' }],
          },
        },
      },
      // existing component with existing category
      {
        type: 'component',
        name: 'testexistingcomponentexistingcategory',
        component: {
          useExisting: 'testnewcomponentnewcategory',
          options: {
            repeatable: false,
            name: 'testexistingcomponentexistingcategory',
            icon: 'globe',
            categorySelect: 'testcategory',
          },
        },
      },
      // TODO: test relations
      // { type: 'relation', name: 'testrelation' },
    ] satisfies AddAttribute[];

    const options = {
      name: 'ArticlesComponent',
      categorySelect: 'product', // use a category we know exists in the test data
      icon: 'paint',
      attributes,
    };

    await createComponent(page, options);
  });
});
