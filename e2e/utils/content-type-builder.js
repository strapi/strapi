import { expect } from '@playwright/test';

export async function createComponent({ page, existingCategory, category, displayName }) {
  await page.getByRole('button', { name: 'Create new component' }).click();
  await page.getByLabel('Display name').fill(displayName);

  // Open the category select
  await page.getByPlaceholder('Select or enter a value').click();

  if (existingCategory) {
    await page.getByLabel(existingCategory).click();
  } else {
    await page.getByPlaceholder('Select or enter a value').fill(category);
    await page.getByPlaceholder('Select or enter a value').press('Enter');
  }

  await page.getByRole('button', { name: 'Continue' }).click();
}

export async function deleteComponent({ page, displayName }) {
  // Accept the confirmation dialog that is displayed when
  // clicking delete
  page.on('dialog', (dialog) => dialog.accept());

  await page.getByRole('link', { name: displayName }).click();

  // The strapi update notifier alert might be displayed in front
  // of the edit button, which prevents the click from working
  if (await page.getByLabel('Close').isVisible()) {
    await page.getByLabel('Close').click();
  }

  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();

  await waitForReload({ page });
}

export async function waitForReload({ page }) {
  await expect(page.locator('text=Waiting for restart...')).toHaveCount(0);
}

export async function addDefaultField({ page, type, name, ...rest }) {
  switch (type) {
    case 'Text':
      await page
        .getByRole('button', { name: 'Text Small or long text like title or description' })
        .click();
      await page.getByLabel('Name', { exact: true }).fill(name);
      break;
  }

  await page.getByRole('button', { name: 'Finish' }).click();
}

export async function verifyFieldPresence({ page, name }) {
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

export async function createContentType({ page, type, displayName }) {
  await page.getByRole('button', { name: `Create new ${type}` }).click();
  await page.getByLabel('Display name').fill(displayName);
  await page.getByRole('button', { name: 'Continue' }).click();
}

export async function deleteContentType({ page, displayName }) {
  // Accept the confirmation dialog that is displayed when
  // clicking delete
  page.on('dialog', (dialog) => dialog.accept());

  await page.getByRole('link', { name: displayName }).click();

  // The strapi update notifier alert might be displayed in front
  // of the edit button, which prevents the click from working
  if (await page.getByLabel('Close').isVisible()) {
    await page.getByLabel('Close').click();
  }

  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();

  await waitForReload({ page });
}
