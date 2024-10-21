import { test, expect } from '@playwright/test';
import { resetFiles } from '../../../utils/file-reset';
import { sharedSetup } from '../../../utils/setup';
import { createComponent } from '../../../utils/components';

test.describe('Create a new component', () => {
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
      attributes: [{ type: 'text', name: 'testtext' }],
    };

    await createComponent(page, options);
  });

  test('Can create a component using a previously created category', async ({ page }) => {
    const options = {
      name: 'PostsComponent',
      categorySelect: 'BlogPosts',
      icon: 'alien',
      attributes: [{ type: 'text', name: 'testtext' }],
    };

    await createComponent(page, options);
  });
});
