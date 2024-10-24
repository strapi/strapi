import { test, expect } from '@playwright/test';
import { resetFiles } from '../../../utils/file-reset';
import { sharedSetup } from '../../../utils/setup';
import { createComponent, type AddAttribute } from '../../../utils/components';

test.describe('Create a new component', () => {
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
    { type: 'time', name: 'testdatetime', date: { format: 'time' } },
    { type: 'datetime', name: 'testdatedatetime', date: { format: 'datetime' } },
    { type: 'password', name: 'testpassword' },
    { type: 'media', name: 'testmediasingle', media: { multiple: false } },
    { type: 'media', name: 'testmediamultiple', media: { multiple: true } },
    {
      type: 'enumeration',
      name: 'testenumeration',
      enumeration: { values: ['first', 'second', 'third'] },
    },
    { type: 'markdown', name: 'testmarkdown' },
    // TODO:
    // { type: 'relation', name: 'testrelation' },
    // { type: 'component', name: 'testcomponent' },
  ] satisfies AddAttribute[];

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
      name: 'ArticlesComponent',
      categoryCreate: 'BlogPosts',
      icon: 'paint',
      attributes,
    };

    await createComponent(page, options);
  });

  test('Can create a component using a previously created category', async ({ page }) => {
    const options = {
      name: 'PostsComponent',
      categorySelect: 'BlogPosts',
      icon: 'alien',
      attributes,
    };

    await createComponent(page, options);
  });
});
