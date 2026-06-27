import { test, expect, type Page } from '@playwright/test';
import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { clickAndWait } from '../../../../utils/shared';

const createProductInNewCarousel = async (
  page: Page,
  {
    action,
    carouselTitle,
    productName,
    existingProductName,
  }: {
    action: 'Save' | 'Publish';
    carouselTitle: string;
    productName: string;
    existingProductName?: string;
  }
) => {
  await login({ page });
  await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
  // Step 1. Got to Shop single-type
  await clickAndWait(page, page.getByRole('link', { name: 'Shop' }));
  // Step 2. Add a new component
  await clickAndWait(page, page.getByRole('button', { name: 'Add a component to content' }));
  // Step 3. Choose the new product carousel component and open its toggle
  await clickAndWait(page, page.getByRole('button', { name: 'Product carousel' }).first());

  const productCarousel = page.getByRole('region', { name: /Product carousel/ });
  const carouselTitleInput = productCarousel.getByRole('textbox', { name: 'title' });
  await carouselTitleInput.fill(carouselTitle);
  await expect(carouselTitleInput).toHaveValue(carouselTitle);

  // Step 4. Select a product
  await page.getByRole('combobox', { name: 'products' }).click();
  if (existingProductName) {
    await page.getByRole('option', { name: existingProductName }).click();
    await expect(page.getByRole('button', { name: existingProductName })).toBeVisible();
    await page.getByRole('combobox', { name: 'products' }).click();
  }
  // Step 5. Open the relation modal
  await page.getByRole('option', { name: 'Create a relation' }).click();
  await expect(page.getByText('Create a relation')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Untitled' })).toBeVisible();

  // Change the name of the article
  const name = page.getByRole('textbox', { name: 'name' });
  await name.fill(productName);

  // Step 6. Save or publish the related document
  await clickAndWait(page, page.getByRole('button', { name: action }));
  await expect(name).toHaveValue(productName);
  await expect(
    page.getByRole('status', { name: action === 'Save' ? 'Draft' : 'Published' }).first()
  ).toBeVisible();

  // Step 7. Close the relation modal to see the updated relation on the root document
  await expect(page.getByText('Edit a relation')).toBeVisible();
  await clickAndWait(page, page.getByRole('button', { name: 'Close modal' }));

  // Wait for the button to be visible with a more specific selector
  if (existingProductName) {
    await expect(page.getByRole('button', { name: existingProductName })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: productName })).toBeVisible();
  await expect(carouselTitleInput).toHaveValue(carouselTitle);

  await page.reload();
  const productCarouselToggle = page.getByRole('button', {
    name: new RegExp(`Product carousel - ${carouselTitle}`),
  });
  await expect(productCarouselToggle).toBeVisible();

  if (existingProductName) {
    await clickAndWait(page, productCarouselToggle);
    await expect(page.getByRole('button', { name: existingProductName })).toBeVisible();
    await expect(page.getByRole('button', { name: productName })).toBeVisible();
  }
};

test.describe('Relations on the fly - Create a Relation inside a new component and Save', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
  });

  test('I want to create a relation inside a new component, and save', async ({ page }) => {
    await createProductInNewCarousel(page, {
      action: 'Save',
      carouselTitle: 'Summer shoes',
      productName: 'Nike Zoom Kd Iv Gold C800',
    });
  });

  test('I want to create a relation inside a new component, and publish', async ({ page }) => {
    await createProductInNewCarousel(page, {
      action: 'Publish',
      carouselTitle: 'Winter boots',
      productName: 'Nike Zoom Kd Iv Gold C801',
    });
  });

  test('I want to keep a selected relation when creating another relation inside a new component', async ({
    page,
  }) => {
    await createProductInNewCarousel(page, {
      action: 'Save',
      carouselTitle: 'Sale picks',
      productName: 'Nike Zoom Kd Iv Gold C802',
      existingProductName: 'Nike Mens 23/24 Away Stadium Jersey',
    });
  });
});
