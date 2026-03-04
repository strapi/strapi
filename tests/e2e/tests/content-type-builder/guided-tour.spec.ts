import { test, expect } from '@playwright/test';
import { sharedSetup } from '../../../utils/setup';
import { STRAPI_GUIDED_TOUR_CONFIG, setGuidedTourLocalStorage } from '../../../utils/global-setup';
import { clickAndWait, describeOnCondition } from '../../../utils/shared';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describeOnCondition(edition === 'EE')('Guided tour - Content Type Builder (AI Chat)', () => {
  test.beforeEach(async ({ page }) => {
    await setGuidedTourLocalStorage(page, { ...STRAPI_GUIDED_TOUR_CONFIG, enabled: true });

    await sharedSetup('guided-tour', page, {
      login: true,
      resetFiles: true,
      importData: 'with-admin.tar',
    });
  });
  test('should see the ai content-type-builder tour if ai isenabled', async ({ page }) => {
    await clickAndWait(
      page,
      page.getByRole('listitem', { name: 'Create your schema' }).getByRole('link', {
        name: 'Start',
      })
    );
    const nextButton = page.getByRole('button', { name: 'Next' });
    const gotItButton = page.getByRole('button', { name: 'Got it' });
    await expect(
      page.getByRole('dialog', { name: 'Welcome to the Content-Type Builder!' })
    ).toBeVisible();

    // Check if AI feature is enabled
    const isAiEnabled = await page.evaluate(() => {
      return window.strapi.features.isEnabled('cms-ai');
    });
    if (isAiEnabled) {
      await nextButton.click();
      await expect(page.getByRole('dialog', { name: 'Time to get started!' })).toBeVisible();
      await nextButton.click();
      // Check if the AI chat is opened
      await expect(page.getByRole('textbox', { name: 'Ask Strapi AI...' })).toBeVisible();
    }
  });
});
