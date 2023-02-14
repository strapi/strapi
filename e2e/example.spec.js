const { test, expect } = require('@playwright/test');

test('Homepage', async ({ page }) => {
  await page.goto('/admin');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle('Strapi Admin');
});
