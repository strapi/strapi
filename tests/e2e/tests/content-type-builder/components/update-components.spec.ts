import { test, expect } from '@playwright/test';
import { resetFiles } from '../../../utils/file-reset';
import { sharedSetup } from '../../../utils/setup';
import {
  createComponent,
  createSingleType,
  createCollectionType,
  addAttributeToComponent,
  removeAttributeFromComponent,
  deleteComponent,
  type AddAttribute,
} from '../../../utils/content-types';
import { navToHeader } from '../../../utils/shared';

test.describe('Update a new component', () => {
  // very long timeout for these tests because they restart the server multiple times
  test.describe.configure({ timeout: 300000 });

  const originalAttributes = [{ type: 'text', name: 'testtext' }] satisfies AddAttribute[];

  const addedAttribute = {
    type: 'text',
    name: 'addedtext',
  };

  const componentAttributeName = 'mycomponentname';

  const singleType = {
    attributes: [
      {
        component: {
          useExisting: 'SomeComponent',
          options: {
            name: componentAttributeName,
          },
        },
        type: 'component',
        name: componentAttributeName,
      },
    ],
    name: 'Singletypepage',
  };

  const collectionType = {
    attributes: [
      {
        component: {
          useExisting: 'SomeComponent',
          options: {
            name: componentAttributeName,
          },
        },
        type: 'component',
        name: componentAttributeName,
      },
    ],
    name: 'Mycollectiontype',
  };

  test.beforeEach(async ({ page }) => {
    await sharedSetup('update-component', page, {
      resetFiles: true,
      importData: 'with-admin.tar',
      login: true,
      skipTour: true,
      afterSetup: async () => {
        const options = {
          name: 'SomeComponent',
          categoryCreate: 'BlogPosts',
          icon: 'paint',
          attributes: originalAttributes,
        };

        await createComponent(page, options);

        // https://github.com/strapi/strapi/issues/21943
        // Until that's fixed we have to manually navigate away
        await navToHeader(page, ['Content Manager', 'Homepage'], 'Homepage');
        await navToHeader(page, ['Content-Type Builder'], 'Article');

        await createCollectionType(page, collectionType);

        await createSingleType(page, singleType);
      },
    });
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test('Add attribute to component', async ({ page }) => {
    await addAttributeToComponent(page, 'SomeComponent', addedAttribute);

    // confirm that it exists in the content type this component was in
    await navToHeader(page, ['Content-Type Builder', collectionType.name], collectionType.name);
    await expect(page.getByText(addedAttribute.name, { exact: true })).toBeVisible();

    // confirm that it exists in the single type this component was in
    await navToHeader(page, ['Content-Type Builder', singleType.name], singleType.name);
    await expect(page.getByText(addedAttribute.name, { exact: true })).toBeVisible();
  });

  test('Remove attribute from component', async ({ page }) => {
    const removedAttribute = originalAttributes[0];
    // confirm that it initially exists in the content type this component was in
    await navToHeader(page, ['Content-Type Builder', collectionType.name], collectionType.name);
    await expect(page.getByText(removedAttribute.name, { exact: true })).toBeVisible();

    // confirm that it initially exists in the single type this component was in
    await navToHeader(page, ['Content-Type Builder', singleType.name], singleType.name);
    await expect(page.getByText(removedAttribute.name, { exact: true })).toBeVisible();

    await removeAttributeFromComponent(page, 'SomeComponent', removedAttribute.name);

    // confirm that it no longer exists in the content type this component was in
    await navToHeader(page, ['Content-Type Builder', collectionType.name], collectionType.name);
    await expect(page.getByText(removedAttribute.name, { exact: true })).not.toBeVisible();

    // confirm that it no longer exists in the single type this component was in
    await navToHeader(page, ['Content-Type Builder', singleType.name], singleType.name);
    await expect(page.getByText(removedAttribute.name, { exact: true })).not.toBeVisible();
  });

  test('delete component', async ({ page }) => {
    // confirm it exists in collection type
    await navToHeader(page, ['Content-Type Builder', collectionType.name], collectionType.name);
    await expect(page.getByText(componentAttributeName, { exact: true })).toBeVisible();

    // confirm it exists in single type
    await navToHeader(page, ['Content-Type Builder', singleType.name], singleType.name);
    await expect(page.getByText(componentAttributeName, { exact: true })).toBeVisible();

    // confirm it exists in navigation
    await expect(page.getByRole('link', { name: 'SomeComponent' })).toBeVisible();

    // delete it
    await deleteComponent(page, 'SomeComponent');

    // confirm that it no longer exists in the content type this component was in
    await navToHeader(page, ['Content-Type Builder', collectionType.name], collectionType.name);
    await expect(page.getByText(componentAttributeName, { exact: true })).not.toBeVisible();

    // confirm that it no longer exists in the single type this component was in
    await navToHeader(page, ['Content-Type Builder', singleType.name], singleType.name);
    await expect(page.getByText(componentAttributeName, { exact: true })).not.toBeVisible();

    // confirm that is not longer exists in the navigation
    await expect(page.getByRole('link', { name: 'SomeComponent' })).not.toBeVisible();
  });
});
