import { test, expect } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../scripts/dts-import';

test.describe('Edit View', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('./e2e/data/with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test.describe('Collection Type', () => {
    const CREATE_URL =
      /\/admin\/content-manager\/collection-types\/api::article.article\/create(\?.*)?/;
    const EDIT_URL =
      /\/admin\/content-manager\/collection-types\/api::article.article\/[^/]+(\?.*)?/;
    const LIST_URL = /\/admin\/content-manager\/collection-types\/api::article.article(\?.*)?/;

    test('A user should be able to navigate to the EditView of the content manager to create, save, publish, unpublish & delete a new entry', async ({
      page,
    }) => {
      await page.getByRole('link', { name: 'Content Manager' }).click();
      await page.getByRole('link', { name: /Create new entry/ }).click();

      /**
       * Now we're in the edit view.
       */
      await page.waitForURL(CREATE_URL);

      await expect(page.getByRole('heading', { name: 'Create an entry' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'More actions' })).not.toBeDisabled();

      /**
       * There should be two tabs, draft and published.
       * The draft tab should be active by default.
       * The published tab should be disabled.
       */
      await expect(page.getByRole('tab', { name: 'Draft' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Published' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Draft' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      await expect(page.getByRole('tab', { name: 'Published' })).toHaveAttribute(
        'aria-selected',
        'false'
      );
      await expect(page.getByRole('tab', { name: 'Draft' })).not.toBeDisabled();
      await expect(page.getByRole('tab', { name: 'Published' })).toBeDisabled();

      /**
       * Both the publish & save button should be enabled only after we start filling in the form
       * and it should disable itself after we save the entry. The publish button should still be enabled.
       */
      await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'More document actions' })).toBeDisabled();
      await page.getByRole('textbox', { name: 'title' }).fill('Being from Kansas City');
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved')).toBeVisible();
      // the title should update post save because it's the `mainField` of the content-type
      await expect(page.getByRole('heading', { name: 'Being from Kansas City' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Create an entry' })).not.toBeVisible();
      await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'More document actions' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Publish' })).not.toBeDisabled();

      /**
       * Now we go back to the list view to confirm our new entry has been correctly added to the database.
       */
      await page.getByRole('link', { name: 'Content Manager' }).click();
      await page.waitForURL(LIST_URL);
      await expect(page.getByRole('gridcell', { name: 'Being from Kansas City' })).toBeVisible();
      await page.getByRole('gridcell', { name: 'Being from Kansas City' }).click();

      /**
       * We then go back to the edit view to make changes & use the publish action
       */
      await page.waitForURL(EDIT_URL);
      await page.getByRole('textbox', { name: 'title' }).fill('');
      await page.getByRole('textbox', { name: 'title' }).fill('Being an American');
      await page
        .getByRole('textbox')
        .nth(1)
        .fill('I miss the denver broncos, now I can only watch it on the evening.');

      /**
       * TODO: relations are not supported atm.
       */
      // await page.getByRole('combobox', { name: 'authors' }).click();

      // expect(page.getByRole('option', { name: 'State: Draft Ted Lasso' })).toBeEnabled();
      // await page.getByRole('option', { name: 'State: Published Ted Lasso' }).click();

      // await expect(page.getByRole('link', { name: 'Ted Lasso' })).toBeVisible();

      /**
       * When we click publish, we should be moved to the publish tab where all the actions
       * are disabled, going back to the draft tab will tell us what actions are then
       * available.
       */
      await expect(page.getByRole('button', { name: 'Publish' })).not.toBeDisabled();
      await page.getByRole('button', { name: 'Publish' }).click();
      await expect(page.getByText('Success:Published')).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Draft' })).toHaveAttribute(
        'aria-selected',
        'false'
      );
      await expect(page.getByRole('tab', { name: 'Published' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'More document actions' })).toBeDisabled();

      await page.getByRole('tab', { name: 'Draft' }).click();
      await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'More document actions' })).not.toBeDisabled();

      await page.getByRole('button', { name: 'More document actions' }).click();
      await expect(page.getByRole('menuitem', { name: 'Unpublish' })).not.toBeDisabled();
      await expect(page.getByRole('menuitem', { name: 'Discard changes' })).toBeDisabled();
      await page.keyboard.press('Escape'); // close the menu since we're not actioning on it atm.

      /**
       * Now we'll work with our actions, starting with making more changes to a draft
       * to then discard them.
       */
      await page.getByRole('textbox', { name: 'title' }).fill('Being an American in the UK');
      await expect(page.getByRole('button', { name: 'Save' })).not.toBeDisabled();
      await expect(page.getByRole('button', { name: 'Publish' })).not.toBeDisabled();
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved')).toBeVisible();
      await page.getByRole('button', { name: 'More document actions' }).click();
      await expect(page.getByRole('menuitem', { name: 'Unpublish' })).not.toBeDisabled();
      await expect(page.getByRole('menuitem', { name: 'Discard changes' })).not.toBeDisabled();
      await page.getByRole('menuitem', { name: 'Discard changes' }).click();
      await expect(page.getByRole('dialog', { name: 'Confirmation' })).toBeVisible();
      await page.getByRole('button', { name: 'Confirm' }).click();
      await expect(page.getByText('Success:Changes discarded')).toBeVisible();
      await expect(page.getByLabel('title')).toHaveValue('Being an American'); // ensure the form has updated.

      /**
       * Now we'll unpublish the entry while it is unmodified
       *
       * NOTE: because of a bug in the statuses, we still think it's modified
       * and as such we get the option to discard the draft.
       */
      await page.getByRole('button', { name: 'More document actions' }).click();
      await expect(page.getByRole('menuitem', { name: 'Unpublish' })).not.toBeDisabled();
      // await expect(page.getByRole('menuitem', { name: 'Discard changes' })).toBeDisabled(); // this won't be disabled because we still think the document is modified
      await page.getByRole('menuitem', { name: 'Unpublish' }).click();
      await expect(page.getByRole('dialog', { name: 'Confirmation' })).toBeVisible();
      await expect(
        page.getByRole('radio', { name: 'Unpublish and keep last draft' })
      ).toBeVisible();
      await expect(
        page.getByRole('radio', { name: 'Unpublish and keep last draft' })
      ).toBeChecked();
      await expect(
        page.getByRole('radio', { name: 'Unpublish and replace last draft' })
      ).toBeVisible();
      await page.getByRole('button', { name: 'Confirm' }).click();
      await expect(page.getByText('Success:Unpublished')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Publish' })).not.toBeDisabled();
      await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'More document actions' })).toBeDisabled();

      /**
       * Finally, we'll delete the document.
       */
      await expect(page.getByRole('button', { name: 'More actions' })).not.toBeDisabled();
      await page.getByRole('button', { name: 'More actions' }).click();
      await expect(page.getByRole('menuitem', { name: 'Edit the model' })).not.toBeDisabled();
      await expect(page.getByRole('menuitem', { name: 'Configure the view' })).not.toBeDisabled();
      await expect(page.getByRole('menuitem', { name: 'Delete document' })).not.toBeDisabled();
      await page.getByRole('menuitem', { name: 'Delete document' }).click();
      await expect(page.getByRole('dialog', { name: 'Confirmation' })).toBeVisible();
      await page.getByRole('button', { name: 'Confirm' }).click();
      await expect(page.getByText('Success:Deleted')).toBeVisible();

      /**
       * We're back on the list view and we can asser the document was correctly deleted.
       */
      await page.waitForURL(LIST_URL);
      await expect(
        page.getByRole('gridcell', { name: 'Being from Kansas City' })
      ).not.toBeVisible();
    });
  });

  test.describe('Single Type', () => {
    const EDIT_URL = /\/admin\/content-manager\/single-types\/api::homepage.homepage(\?.*)?/;

    test('A user should be able to navigate to the EditView of the content manager to create, save, publish, unpublish & delete a new entry', async ({
      page,
    }) => {
      await page.getByRole('link', { name: 'Content Manager' }).click();
      await page.getByRole('link', { name: 'Homepage' }).click();

      /**
       * Now we're in the edit view.
       */
      await page.waitForURL(EDIT_URL);

      await expect(page.getByRole('heading', { name: 'Untitled' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'More actions' })).not.toBeDisabled();

      /**
       * There should be two tabs, draft and published.
       * The draft tab should be active by default.
       * The published tab should be disabled.
       */
      await expect(page.getByRole('tab', { name: 'Draft' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Published' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Draft' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      await expect(page.getByRole('tab', { name: 'Published' })).toHaveAttribute(
        'aria-selected',
        'false'
      );
      await expect(page.getByRole('tab', { name: 'Draft' })).not.toBeDisabled();
      await expect(page.getByRole('tab', { name: 'Published' })).toBeDisabled();

      /**
       * Both the publish & save button should be enabled only after we start filling in the form
       * and it should disable itself after we save the entry. The publish button should still be enabled.
       */
      await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'More document actions' })).toBeDisabled();
      await page.getByRole('textbox', { name: 'title' }).fill('Welcome to AFC Richmond');
      await page
        .getByRole('textbox')
        .nth(1)
        .fill(
          "We're a premier league football club based in South West London with a vicious rivalry with Fulham. Because who doens't hate them?"
        );
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved')).toBeVisible();
      // the title should update post save because it's the `mainField` of the content-type
      await expect(page.getByRole('heading', { name: 'Welcome to AFC Richmond' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Untitled' })).not.toBeVisible();
      await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'More document actions' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Publish' })).not.toBeDisabled();

      /**
       * When we click publish, we should be moved to the publish tab where all the actions
       * are disabled, going back to the draft tab will tell us what actions are then
       * available.
       */
      await page.getByRole('button', { name: 'Publish' }).click();
      await expect(page.getByText('Success:Published')).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Draft' })).toHaveAttribute(
        'aria-selected',
        'false'
      );
      await expect(page.getByRole('tab', { name: 'Published' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'More document actions' })).toBeDisabled();

      await page.getByRole('tab', { name: 'Draft' }).click();
      await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'More document actions' })).not.toBeDisabled();

      await page.getByRole('button', { name: 'More document actions' }).click();
      await expect(page.getByRole('menuitem', { name: 'Unpublish' })).not.toBeDisabled();
      await expect(page.getByRole('menuitem', { name: 'Discard changes' })).toBeDisabled();
      await page.keyboard.press('Escape'); // close the menu since we're not actioning on it atm.

      /**
       * Now we'll work with our actions, starting with making more changes to a draft
       * to then discard them.
       */
      await page.getByRole('textbox', { name: 'title' }).fill('Welcome to Richmond');
      await expect(page.getByRole('button', { name: 'Save' })).not.toBeDisabled();
      await expect(page.getByRole('button', { name: 'Publish' })).not.toBeDisabled();
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Saved')).toBeVisible();
      await page.getByRole('button', { name: 'More document actions' }).click();
      await expect(page.getByRole('menuitem', { name: 'Unpublish' })).not.toBeDisabled();
      await expect(page.getByRole('menuitem', { name: 'Discard changes' })).not.toBeDisabled();
      await page.getByRole('menuitem', { name: 'Discard changes' }).click();
      await expect(page.getByRole('dialog', { name: 'Confirmation' })).toBeVisible();
      await page.getByRole('button', { name: 'Confirm' }).click();
      await expect(page.getByText('Success:Changes discarded')).toBeVisible();
      await expect(page.getByLabel('title')).toHaveValue('Welcome to AFC Richmond'); // ensure the form has updated.

      /**
       * Now we'll unpublish the entry while it is unmodified
       *
       * NOTE: because of a bug in the statuses, we still think it's modified
       * and as such we get the option to discard the draft.
       */
      await page.getByRole('button', { name: 'More document actions' }).click();
      await expect(page.getByRole('menuitem', { name: 'Unpublish' })).not.toBeDisabled();
      // await expect(page.getByRole('menuitem', { name: 'Discard changes' })).toBeDisabled(); // this won't be disabled because we still think the document is modified
      await page.getByRole('menuitem', { name: 'Unpublish' }).click();
      await expect(page.getByRole('dialog', { name: 'Confirmation' })).toBeVisible();
      await expect(
        page.getByRole('radio', { name: 'Unpublish and keep last draft' })
      ).toBeVisible();
      await expect(
        page.getByRole('radio', { name: 'Unpublish and keep last draft' })
      ).toBeChecked();
      await expect(
        page.getByRole('radio', { name: 'Unpublish and replace last draft' })
      ).toBeVisible();
      await page.getByRole('button', { name: 'Confirm' }).click();
      await expect(page.getByText('Success:Unpublished')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Publish' })).not.toBeDisabled();
      await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'More document actions' })).toBeDisabled();

      /**
       * Finally, we'll delete the document.
       */
      await expect(page.getByRole('button', { name: 'More actions' })).not.toBeDisabled();
      await page.getByRole('button', { name: 'More actions' }).click();
      await expect(page.getByRole('menuitem', { name: 'Edit the model' })).not.toBeDisabled();
      await expect(page.getByRole('menuitem', { name: 'Configure the view' })).not.toBeDisabled();
      await expect(page.getByRole('menuitem', { name: 'Delete document' })).not.toBeDisabled();
      await page.getByRole('menuitem', { name: 'Delete document' }).click();
      await expect(page.getByRole('dialog', { name: 'Confirmation' })).toBeVisible();
      await page.getByRole('button', { name: 'Confirm' }).click();
      await expect(page.getByText('Success:Deleted')).toBeVisible();

      /**
       * The form should be completely reset.
       */
      await expect(page.getByRole('heading', { name: 'Untitled' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'More actions' })).not.toBeDisabled();
      await expect(page.getByRole('textbox', { name: 'title' })).toHaveValue('');
      await expect(page.getByRole('tab', { name: 'Draft' })).not.toBeDisabled();
      await expect(page.getByRole('tab', { name: 'Published' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'More document actions' })).toBeDisabled();
    });
  });
});
