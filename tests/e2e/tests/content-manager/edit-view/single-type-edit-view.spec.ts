import { test, expect } from '@playwright/test';
import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { findAndClose, navToHeader } from '../../../utils/shared';

test.describe('Edit View', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test.describe('Single Type', () => {
    const EDIT_URL = /\/admin\/content-manager\/single-types\/api::homepage.homepage(\?.*)?/;
    const SHOP_URL = /\/admin\/content-manager\/single-types\/api::shop.shop(\?.*)?/;

    // TODO: Skip this test for now since there is a known bug with the draft relations check
    test.fixme(
      'as a user I want to be warned if I try to publish content that has draft relations on components within a dynamic zone',
      async ({ page }) => {
        await page.getByLabel('Content Manager').click();
        await page.getByRole('link', { name: 'Shop' }).click();

        await page.waitForURL(SHOP_URL);

        // Navigate to the product carousel component
        await page.getByRole('button', { name: 'Product carousel - 23/24 kits' }).click();

        // Select a product from the combobox
        await page.getByRole('combobox', { name: 'products' }).click();
        await page.getByLabel('Nike Mens 23/24 Away Stadium').click();

        // Attempt to publish the entry
        await page.getByRole('button', { name: 'Publish' }).click();

        // Verify that a warning about a single draft relation is displayed
        await expect(page.getByText('This entry is related to 1')).toBeVisible();
        await page.getByRole('button', { name: 'Cancel' }).click();

        // Save the current state of the entry
        await page.getByRole('button', { name: 'Save' }).click();
        await findAndClose(page, 'Saved Document');

        // Attempt to publish the entry once more
        await page.getByRole('button', { name: 'Publish' }).click();
        await expect(page.getByText('This entry is related to 1')).toBeVisible();
      }
    );

    test('as a user I want to create and publish a document at the same time, then modify and save that document.', async ({
      page,
    }) => {
      await page.getByRole('link', { name: 'Content Manager' }).click();
      await page.getByRole('link', { name: 'Homepage' }).click();

      /**
       * Now we're in the edit view.
       */
      await page.waitForURL(EDIT_URL);

      await expect(page.getByRole('heading', { name: 'Homepage' })).toBeVisible();
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
      await page.getByRole('textbox', { name: 'title' }).fill('Welcome to AFC Richmond');

      await page.getByRole('button', { name: 'Publish' }).click();
      await findAndClose(page, 'Published Document');

      /**
       * When we click publish, we should stay on the draft tab but check the published tab to ensure
       * all the actions are disabled, going back to the draft tab will tell us what actions are then
       * available.
       */
      await expect(page.getByRole('tab', { name: 'Draft' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      await expect(page.getByRole('tab', { name: 'Published' })).toHaveAttribute(
        'aria-selected',
        'false'
      );
      await expect(page.getByRole('tab', { name: 'Published' })).toBeEnabled();
      await page.getByRole('tab', { name: 'Published' }).click();
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

      await page.getByRole('tab', { name: 'Draft' }).click();
      await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'More document actions' })).not.toBeDisabled();

      await page.getByRole('button', { name: 'More document actions' }).click();
      await expect(
        page.getByRole('menuitem', { name: 'Unpublish', exact: true })
      ).not.toBeDisabled();
      await expect(page.getByRole('menuitem', { name: 'Discard changes' })).toBeDisabled();
      await page.keyboard.press('Escape'); // close the menu since we're not actioning on it atm.

      await page.getByRole('textbox').nth(1).click();
      await page
        .getByRole('textbox')
        .nth(1)
        .fill(
          "We're a premier league football club based in South West London with a vicious rivalry with Fulham. Because who doens't hate them?"
        );

      await page.getByRole('button', { name: 'Save' }).click();
      await findAndClose(page, 'Saved Document');

      await expect(page.getByText('Modified')).toBeVisible();
    });

    test('as a user I want to create a document, then modify that document', async ({ page }) => {
      await page.getByRole('link', { name: 'Content Manager' }).click();
      await page.getByRole('link', { name: 'Homepage' }).click();

      /**
       * Now we're in the edit view.
       */
      await page.waitForURL(EDIT_URL);

      await expect(page.getByRole('heading', { name: 'Homepage' })).toBeVisible();
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
      await page.getByRole('textbox', { name: 'title' }).fill('Welcome to AFC Richmond');

      await page.getByRole('button', { name: 'Save' }).click();
      await findAndClose(page, 'Saved Document');

      await expect(page.getByRole('tab', { name: 'Draft' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      await expect(page.getByRole('tab', { name: 'Published' })).toHaveAttribute(
        'aria-selected',
        'false'
      );
      await expect(page.getByRole('tab', { name: 'Draft' })).toBeEnabled();
      await expect(page.getByRole('tab', { name: 'Published' })).toBeDisabled();

      // the title should update post save because it's the `mainField` of the content-type
      await expect(page.getByRole('heading', { name: 'Welcome to AFC Richmond' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Homepage' })).not.toBeVisible();
      await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Publish' })).not.toBeDisabled();

      await page.getByRole('textbox').nth(1).click();
      await page
        .getByRole('textbox')
        .nth(1)
        .fill(
          "We're a premier league football club based in South West London with a vicious rivalry with Fulham. Because who doens't hate them?"
        );

      await expect(page.getByRole('button', { name: 'Save' })).not.toBeDisabled();

      await page.getByRole('button', { name: 'Save' }).click();
      await findAndClose(page, 'Saved Document');

      await expect(page.getByRole('tab', { name: 'Draft' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      await expect(page.getByRole('tab', { name: 'Published' })).toHaveAttribute(
        'aria-selected',
        'false'
      );
      await expect(page.getByRole('tab', { name: 'Draft' })).toBeEnabled();
      await expect(page.getByRole('tab', { name: 'Published' })).toBeDisabled();
      await expect(page.getByText('Modified')).not.toBeVisible();
    });

    test('as a user I want to be able to discard my changes', async ({ page }) => {
      await page.getByRole('link', { name: 'Content Manager' }).click();
      await page.getByRole('link', { name: 'Shop' }).click();

      await page.getByRole('button', { name: 'Publish' }).click();

      await findAndClose(page, 'Published Document');

      await page.getByRole('button', { name: 'More document actions' }).click();
      await expect(page.getByRole('menuitem', { name: 'Discard changes' })).toBeDisabled();
      await page.keyboard.press('Escape'); // close the menu since we're not actioning on it atm.

      await page
        .getByRole('textbox', { name: 'title This value is unique for the selected locale' })
        .first()
        .fill('International Shop');
      await page.getByRole('button', { name: 'Save' }).click();

      await findAndClose(page, 'Saved Document');

      await page.getByRole('button', { name: 'More document actions' }).click();
      await expect(page.getByRole('menuitem', { name: 'Discard changes' })).not.toBeDisabled();
      await page.getByRole('menuitem', { name: 'Discard changes' }).click();
      await page.getByRole('button', { name: 'Confirm' }).click();

      await findAndClose(page, 'Changes discarded');

      await expect(page.getByRole('heading', { name: 'UK Shop' })).toBeVisible();
    });

    test('as a user I want to unpublish a document', async ({ page }) => {
      await page.getByRole('link', { name: 'Content Manager' }).click();
      await page.getByRole('link', { name: 'Shop' }).click();

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

      await page.getByRole('button', { name: 'Publish' }).click();
      await findAndClose(page, 'Published Document');

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
      await expect(page.getByRole('tab', { name: 'Published' })).not.toBeDisabled();

      await page.getByRole('button', { name: 'More document actions' }).click();
      await expect(
        page.getByRole('menuitem', { name: 'Unpublish', exact: true })
      ).not.toBeDisabled();
      await page.getByRole('menuitem', { name: 'Unpublish', exact: true }).click();

      await findAndClose(page, 'Unpublished Document');

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
    });

    test('as a user I want to add a component to a dynamic zone at a specific position', async ({
      page,
    }) => {
      await page.getByLabel('Content Manager').click();
      await navToHeader(page, ['Content Manager', 'Shop'], 'UK Shop');

      // There should be a dynamic zone with two components
      const components = await page
        .getByRole('listitem')
        .filter({ has: page.getByRole('heading') })
        .all();
      expect(components).toHaveLength(2);
      expect(components[0]).toHaveText(/product carousel/i);
      expect(components[1]).toHaveText(/content and image/i);

      // Add components at specific locations:
      // - very last position
      await components[1].getByRole('button', { name: /more actions/i }).click();
      await page.getByRole('menuitem', { name: /add component below/i }).dispatchEvent('click');
      await page.getByRole('menuitem', { name: /product carousel/i }).dispatchEvent('click');
      // - very first position
      await components[0].getByRole('button', { name: /more actions/i }).click();
      await page.getByRole('menuitem', { name: /add component above/i }).dispatchEvent('click');
      await page.getByRole('menuitem', { name: /hero image/i }).dispatchEvent('click');
      // - middle position
      await components[1].getByRole('button', { name: /more actions/i }).click();
      await page.getByRole('menuitem', { name: /add component below/i }).dispatchEvent('click');
      await page.getByRole('menuitem', { name: /hero image/i }).dispatchEvent('click');

      // Make sure we get the desired components order
      const componentTexts = await page
        .getByRole('listitem')
        .filter({ has: page.getByRole('heading') })
        .allTextContents();

      expect(componentTexts.length).toBe(5);
      expect(componentTexts[0].toLowerCase()).toContain('hero image');
      expect(componentTexts[1].toLowerCase()).toContain('product carousel');
      expect(componentTexts[2].toLowerCase()).toContain('hero image');
      expect(componentTexts[3].toLowerCase()).toContain('content and image');
      expect(componentTexts[4].toLowerCase()).toContain('product carousel');
    });
  });
});
