import { test, expect, type Request } from '@playwright/test';
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

    // Connecting the newly created relation must never PUT the whole shop single-type to the
    // server — that would silently persist the still-unsaved new component along with it.
    const parentUpdates: string[] = [];
    const trackParentUpdate = (request: Request) => {
      if (
        request.method() === 'PUT' &&
        request.url().includes('/content-manager/single-types/api::shop.shop')
      ) {
        parentUpdates.push(request.url());
      }
    };
    page.on('request', trackParentUpdate);
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await expect(name).toHaveValue(productName);
    await expect(page.getByRole('status', { name: 'Draft' }).first()).toBeVisible();
    await expect(page.getByText('Edit a relation')).toBeVisible();
    page.off('request', trackParentUpdate);
    expect(parentUpdates).toEqual([]);

    // The relation and the new component both show locally, still unsaved.
    await clickAndWait(page, page.getByRole('button', { name: 'Close modal' }));
    await expect(page.getByRole('button', { name: productName })).toBeVisible();
    await expect(carouselTitleInput).toHaveValue(carouselTitle);

    // Neither survives a reload on its own — the component and its relation are only persisted
    // once the user explicitly saves the shop entry itself.
    await page.reload();
    await expect(
      page.getByRole('button', { name: new RegExp(`Product carousel - ${carouselTitle}`) })
    ).not.toBeVisible();

    // Redo the same steps and this time explicitly save the parent to persist everything.
    await clickAndWait(page, addComponentButton);
    await clickAndWait(
      page,
      page
        .getByText('Pick one component', { exact: true })
        .locator('xpath=following::button[normalize-space(.)="Product carousel"][1]')
    );
    const newComponents = page
      .getByRole('list')
      .filter({ has: page.getByRole('button', { name: 'Product carousel - 23/24 kits' }) })
      .getByRole('listitem');
    const persistedCarousel = newComponents.nth(componentCount);
    const persistedCarouselTitleInput = persistedCarousel.getByRole('textbox', { name: 'title' });
    await persistedCarouselTitleInput.pressSequentially(carouselTitle);
    await persistedCarouselTitleInput.blur();

    await persistedCarousel.getByRole('combobox', { name: 'products' }).click();
    await page.getByRole('option', { name: 'Create a relation' }).click();
    await page.getByRole('textbox', { name: 'name' }).fill(productName);
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await expect(page.getByText('Edit a relation')).toBeVisible();
    await clickAndWait(page, page.getByRole('button', { name: 'Close modal' }));

    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));

    // Check persistence from a fresh page rather than reloading this one: a second navigation of
    // the same tab aborts WebKit's renderer (`Navigation::initializeForNewWindow`), which
    // Playwright reports as "Page crashed".
    const persistedPage = await page.context().newPage();
    await persistedPage.goto(page.url());
    const productCarouselToggle = persistedPage.getByRole('button', {
      name: new RegExp(`Product carousel - ${carouselTitle}`),
    });
    await expect(productCarouselToggle).toBeVisible();
    await clickAndWait(persistedPage, productCarouselToggle);
    await expect(persistedPage.getByRole('button', { name: productName })).toBeVisible();
  });
});
