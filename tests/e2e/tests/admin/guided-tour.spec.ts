import { test, expect } from '@playwright/test';
import { sharedSetup } from '../../utils/setup';
import { STRAPI_GUIDED_TOUR_CONFIG, setGuidedTourLocalStorage } from '../../utils/global-setup';
import { clickAndWait } from '../../utils/shared';

test.describe('Guided tour', () => {
  test.beforeEach(async ({ page }) => {
    await setGuidedTourLocalStorage(page, { ...STRAPI_GUIDED_TOUR_CONFIG, enabled: true });

    // Now proceed with the normal setup (login, etc.)
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
    await expect(
      page.getByRole('listitem', { name: 'Create and copy an API token' })
    ).toBeVisible();
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
    await expect(page.getByRole('dialog', { name: 'Content-Type Builder' })).toBeVisible();
    await nextButton.click();
    await expect(page.getByRole('dialog', { name: 'Collection Types' })).toBeVisible();
    await nextButton.click();
    await expect(page.getByRole('dialog', { name: 'Single Types' })).toBeVisible();
    await nextButton.click();
    await expect(page.getByRole('dialog', { name: 'Components' })).toBeVisible();
    await gotItButton.click();
    await expect(page.getByRole('dialog', { name: "It's time to create content!" })).toBeVisible();
    await clickAndWait(page, page.getByRole('link', { name: 'Next' }));

    await expect(page).toHaveURL(/.*\/admin\/content-manager.*/);
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
    await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }));
    await expect(page.getByRole('dialog', { name: 'Fields' })).toBeVisible();
    await nextButton.click();
    await expect(page.getByRole('dialog', { name: 'Publish' })).toBeVisible();
    await gotItButton.click();
    await expect(
      page.getByRole('dialog', { name: "It's time to create API tokens!" })
    ).toBeVisible();
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
      page.getByRole('listitem', { name: 'Create and copy an API token' }).getByRole('link', {
        name: 'Start',
      })
    );
    await expect(page.getByRole('dialog', { name: 'API Tokens' })).toBeVisible();
    await nextButton.click();
    await expect(page.getByRole('dialog', { name: 'Create an API token' })).toBeVisible();
    await nextButton.click();
    await clickAndWait(page, page.getByRole('link', { name: 'Create new API token' }));

    await page.getByRole('textbox', { name: 'Name' }).fill('Test token');
    await page.getByRole('combobox', { name: 'Token duration' }).click();
    await page.getByRole('option', { name: '7 days' }).click();
    await page.getByRole('combobox', { name: 'Token type' }).click();
    await page.getByRole('option', { name: 'Read' }).click();
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));

    await expect(page.getByRole('dialog', { name: 'Copy your new API token' })).toBeVisible();
    await gotItButton.click();
    await page.getByRole('button', { name: 'Copy' }).click();
    await expect(
      page.getByRole('dialog', { name: "It's time to deploy your application!" })
    ).toBeVisible();
    await clickAndWait(page, page.getByRole('link', { name: 'Next' }));

    await expect(page).toHaveURL(/.*\/admin/);

    await expect(
      page.getByRole('listitem', { name: 'Create and copy an API token' }).getByText('Done')
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
