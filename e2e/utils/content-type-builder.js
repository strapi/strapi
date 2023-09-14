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
  await expect(page.locator('text=Waiting for restart...')).toHaveCount(0, { timeout: 100000 });
}

export async function addDefaultField({
  page,
  type,
  contentTypeName,
  addMore = false,
  name,
  ...rest
}) {
  switch (type) {
    case 'Text':
      await page
        .getByRole('button', { name: 'Text Small or long text like title or description' })
        .click();
      break;

    case 'Email':
      await page.getByRole('button', { name: 'Email Email field with validations format' }).click();
      break;

    case 'RichText':
      await page
        .getByRole('button', { name: 'Rich text A rich text editor with formatting options' })
        .click();
      break;

    case 'Password':
      await page.getByRole('button', { name: 'Password Password field with encryption' }).click();
      break;

    case 'Number':
      await page.getByRole('button', { name: 'Number Numbers (integer, float, decimal)' }).click();

      // Choose number format
      const { numberType } = rest;

      await page.getByLabel('Number format').click();

      switch (numberType) {
        case 'integer':
          await page.getByLabel('integer (ex: 10)').click();
          break;

        case 'big integer':
          await page.getByLabel('big integer (ex: 123456789)').click();
          break;

        case 'decimal':
          await page.getByLabel('decimal (ex: 2.22)').click();
          break;

        case 'float':
          await page.getByLabel('float (ex: 3.33333333)').click();
          break;
      }

      break;
  }

  await page.getByLabel('Name', { exact: true }).fill(name);

  if (addMore) {
    // the selector needs to be scoped, because there are two buttons
    // using the label "Add another field"
    await page
      .getByLabel(contentTypeName, { exact: true })
      .getByRole('button', { name: 'Add another field' })
      .click();
  } else {
    await page.getByRole('button', { name: 'Finish' }).click();
  }
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
