import { test, expect } from '@playwright/test';
import { login } from '../../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../../utils/dts-import';
import { clickAndWait } from '../../../../utils/shared';

test.describe('Relations on the fly - Create a Relation inside a new component and Save', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
  });

  test('I want to create a relation inside a new component, and save', async ({ page }) => {
    const carouselTitle = 'Summer shoes';
    const productName = 'Nike Zoom Kd Iv Gold C800';

    await login({ page });
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Shop' }));
    const addComponentButton = page.getByRole('button', { name: 'Add a component to content' });
    // Intentionally anchors to `with-admin`'s seeded carousel; update this with
    // `tests/e2e/data/with-admin/entities/entities_00001.jsonl` if its title changes.
    const components = page
      .getByRole('list')
      .filter({ has: page.getByRole('button', { name: 'Product carousel - 23/24 kits' }) })
      .getByRole('listitem');
    await expect(components).toHaveCount(3);
    const componentCount = await components.count();

    await clickAndWait(page, addComponentButton);

    await clickAndWait(
      page,
      page
        .getByText('Pick one component', { exact: true })
        .locator('xpath=following::button[normalize-space(.)="Product carousel"][1]')
    );

    await expect(components).toHaveCount(componentCount + 1);
    const newCarousel = components.nth(componentCount);
    await expect(
      newCarousel.getByRole('button', { name: 'Product carousel', exact: true })
    ).toBeVisible();

    const carouselTitleInput = newCarousel.getByRole('textbox', { name: 'title' });
    await carouselTitleInput.pressSequentially(carouselTitle);
    await carouselTitleInput.blur();
    await expect(carouselTitleInput).toHaveValue(carouselTitle);
    await expect(
      newCarousel.getByRole('button', { name: `Product carousel - ${carouselTitle}` })
    ).toBeVisible();

    await newCarousel.getByRole('combobox', { name: 'products' }).click();
    await page.getByRole('option', { name: 'Create a relation' }).click();
    await expect(page.getByText('Create a relation')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Untitled' })).toBeVisible();

    const name = page.getByRole('textbox', { name: 'name' });
    await name.fill(productName);
    const parentUpdate = page.waitForRequest(
      (request) =>
        request.method() === 'PUT' &&
        request.url().includes('/content-manager/single-types/api::shop.shop')
    );
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    const parentUpdateRequest = await parentUpdate;
    const parentUpdateData = parentUpdateRequest.postDataJSON() as {
      content: Array<{
        __component: string;
        title?: string;
        products?: { connect?: Array<{ documentId?: unknown }> };
      }>;
    };
    expect(parentUpdateData.content).toHaveLength(componentCount + 1);
    expect(parentUpdateData.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          __component: 'page-blocks.product-carousel',
          title: carouselTitle,
          products: expect.objectContaining({
            connect: expect.arrayContaining([
              expect.objectContaining({ documentId: expect.any(String) }),
            ]),
          }),
        }),
      ])
    );
    await expect(name).toHaveValue(productName);
    await expect(page.getByRole('status', { name: 'Draft' }).first()).toBeVisible();

    await expect(page.getByText('Edit a relation')).toBeVisible();
    await clickAndWait(page, page.getByRole('button', { name: 'Close modal' }));

    await expect(page.getByRole('button', { name: productName })).toBeVisible();
    await expect(carouselTitleInput).toHaveValue(carouselTitle);

    await page.reload();
    const productCarouselToggle = page.getByRole('button', {
      name: new RegExp(`Product carousel - ${carouselTitle}`),
    });
    await expect(productCarouselToggle).toBeVisible();
    await clickAndWait(page, productCarouselToggle);
    await expect(page.getByRole('button', { name: productName })).toBeVisible();
  });
});
