import { expect, test } from '@playwright/test';

import { signUp } from './helpers.ts';

for (const mode of ['cookie', 'bearer'] as const) {
  test(`keeps the company from sign-up on the profile and saves a new one (${mode})`, async ({
    page,
  }) => {
    // The sign-up sends `company`, and Strapi writes it to the new user's profile
    await signUp(page, mode, { company: 'Acme' });

    await page.goto('/account');

    const company = page.getByLabel('Company');
    const newsletter = page.getByRole('checkbox', { name: /newsletter/i });

    await expect(company).toHaveValue('Acme');
    await expect(newsletter).not.toBeChecked();

    // Edit it. (Better Auth UI's own profile card has a "Save changes" button too: this one is
    // the button of the form with the company field in it.)
    await company.fill('Globex');
    await newsletter.check();
    await page
      .locator('form', { has: company })
      .getByRole('button', { name: /save changes/i })
      .click();
    await expect(page.getByText('Profile saved')).toBeVisible();

    // A reload reads it back from Strapi
    await page.reload();
    await expect(company).toHaveValue('Globex');
    await expect(newsletter).toBeChecked();
  });
}
