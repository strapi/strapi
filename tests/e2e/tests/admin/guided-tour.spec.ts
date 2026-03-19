import { test, expect } from '@playwright/test';
import { sharedSetup } from '../../../utils/setup';
import { STRAPI_GUIDED_TOUR_CONFIG, setGuidedTourLocalStorage } from '../../../utils/global-setup';
import { clickAndWait, describeOnCondition } from '../../../utils/shared';
import { waitForRestart } from '../../../utils/restart';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describeOnCondition(edition !== 'EE')('Guided tour', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });
  test.beforeEach(async ({ page }) => {
    await setGuidedTourLocalStorage(page, { ...STRAPI_GUIDED_TOUR_CONFIG, enabled: true });

    await sharedSetup('guided-tour', page, {
      login: true,
      resetFiles: true,
      importData: 'with-admin.tar',
    });
  });

  test('should be greeted with the Guided Tour Overview', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Discover your application!' })).toBeVisible();
    await expect(page.getByRole('listitem', { name: 'Create your schema' })).toBeVisible();
    await expect(page.getByRole('listitem', { name: 'Create and publish content' })).toBeVisible();
    await expect(page.getByRole('listitem', { name: 'Copy an API token' })).toBeVisible();
    await expect(
      page.getByRole('listitem', { name: 'Deploy your application to Strapi Cloud' })
    ).toBeVisible();
  });

  test('should start and complete each tour', async ({ page }) => {
    /**
     * Content Type Builder
     */
    await clickAndWait(
      page,
      page.getByRole('listitem', { name: 'Create your schema' }).getByRole('link', {
        name: 'Start',
      })
    );
    const nextButton = page.getByRole('button', { name: 'Next' });
    const gotItButton = page.getByRole('button', { name: 'Got it' });

    await page
      .getByRole('dialog', { name: 'Welcome to the Content-Type Builder!' })
      .getByRole('button', { name: 'Next' })
      .click();
    await page
      .getByRole('dialog', { name: 'Collection Types' })
      .getByRole('button', { name: 'Next' })
      .click();
    await page
      .getByRole('dialog', { name: 'Single Types' })
      .getByRole('button', { name: 'Next' })
      .click();
    await page
      .getByRole('dialog', { name: 'Components' })
      .getByRole('button', { name: 'Next' })
      .click();
    await page
      .getByRole('dialog', { name: 'Your turn — Build something!' })
      .getByRole('button', { name: 'Next' })
      .click();

    // Create collection type
    await page.getByRole('button', { name: 'Create new collection type' }).click();
    await page.getByRole('textbox', { name: 'Display name' }).fill('Test');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(
      page.getByRole('dialog', { name: 'Add a field to bring it to life' })
    ).toBeVisible();
    await gotItButton.click();

    // Add field to collection type
    await page.getByRole('button', { name: 'Add new field' }).last().click();
    await page
      .getByRole('button', { name: 'Text Small or long text like title or description' })
      .click();
    await page.getByRole('textbox', { name: 'Name' }).fill('testField');
    await page.getByRole('button', { name: 'Finish' }).click();

    await expect(page.getByRole('dialog', { name: "Don't leave without saving!" })).toBeVisible();
    await gotItButton.click();
    await page.getByRole('button', { name: 'Save' }).click();
    await waitForRestart(page);

    await expect(page.getByRole('dialog', { name: 'First Step: Done! 🎉' })).toBeVisible();
    await clickAndWait(page, page.getByRole('link', { name: 'Next' }));

    await expect(page).toHaveURL(/.*\/admin\/content-manager\/collection-types\/api::test.test.*/);
    await page.goto('/admin');

    await expect(
      page.getByRole('listitem', { name: 'Create your schema' }).getByText('Done')
    ).toBeVisible();
    await expect(page.getByText('25%')).toBeVisible();

    /**
     * Content Manager
     */
    await clickAndWait(
      page,
      page.getByRole('listitem', { name: 'Create and publish content' }).getByRole('link', {
        name: 'Start',
      })
    );
    await expect(page.getByRole('dialog', { name: 'Content Manager' })).toBeVisible();
    await nextButton.click();
    await expect(page.getByRole('dialog', { name: 'Create new entry' })).toBeVisible();
    await nextButton.click();
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }));
    await expect(page.getByRole('dialog', { name: 'Fields' })).toBeVisible();
    await nextButton.click();
    await expect(page.getByRole('dialog', { name: 'Publish' })).toBeVisible();
    await gotItButton.click();
    await page.getByRole('textbox', { name: 'Title' }).fill('Test');
    await clickAndWait(page, page.getByRole('button', { name: 'Publish' }));
    await expect(page.getByRole('dialog', { name: 'Time to setup API tokens!' })).toBeVisible();
    await clickAndWait(page, page.getByRole('link', { name: 'Next' }));

    await expect(page).toHaveURL(/.*\/admin\/settings\/api-tokens.*/);
    await page.goto('/admin');

    await expect(
      page.getByRole('listitem', { name: 'Create and publish content' }).getByText('Done')
    ).toBeVisible();
    await expect(page.getByText('50%')).toBeVisible();

    /**
     * API Tokens
     */
    await clickAndWait(
      page,
      page.getByRole('listitem', { name: 'Copy an API token' }).getByRole('link', {
        name: 'Start',
      })
    );
    await expect(
      page.getByRole('dialog', { name: 'Last but not least, API tokens' })
    ).toBeVisible();
    await nextButton.click();
    await expect(page.getByRole('dialog', { name: 'Manage an API token' })).toBeVisible();
    await clickAndWait(page, nextButton);
    await clickAndWait(page, page.getByRole('link', { name: 'Edit Read Only' }));

    await expect(page.getByRole('dialog', { name: 'View API token' })).toBeVisible();
    await gotItButton.click();

    /**
     * TODO:
     * Currently the test environment does not work with ENCRYPTION_KEY,
     * so we have to regenerate the token instead of clicking view token directly.
     * In a real app generated with create-strapi-app the view token button is enabled by
     * default.
     *
     * Remove the regeneration clicks below and replace with
     *
     * await page.getByRole('button', { name: 'View token' }).click();
     */
    await page.getByRole('button', { name: 'Regenerate' }).click();
    // Confirm dialog generate button
    await page.getByRole('button', { name: 'Regenerate' }).click();

    await expect(page.getByRole('dialog', { name: 'Copy your API token' })).toBeVisible();
    await gotItButton.click();
    await page.getByRole('button', { name: 'Copy' }).click();
    await expect(
      page.getByRole('dialog', { name: "Congratulations, it's time to deploy your application!" })
    ).toBeVisible();
    await clickAndWait(page, page.getByRole('link', { name: 'Next' }));

    await expect(page).toHaveURL(/.*\/admin/);

    await expect(
      page.getByRole('listitem', { name: 'Copy an API token' }).getByText('Done')
    ).toBeVisible();
    await expect(page.getByText('75%')).toBeVisible();

    /**
     * Deploy
     */
    await clickAndWait(
      page,
      page
        .getByRole('listitem', { name: 'Deploy your application to Strapi Cloud' })
        .getByRole('link', {
          name: 'Read documentation',
        })
    );

    await page.goto('/admin');

    await expect(
      page
        .getByRole('listitem', { name: 'Deploy your application to Strapi Cloud' })
        .getByText('Done')
    ).toBeVisible();
    await expect(page.getByText('100%')).toBeVisible();
  });
});
