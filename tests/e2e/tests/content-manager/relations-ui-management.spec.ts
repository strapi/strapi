import { test, expect, type Page } from '@playwright/test';
import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import {
  clickAndWait,
  findAndClose,
  isElementBefore,
  navToHeader,
  withContentManagerPublish,
  withContentManagerSave,
} from '../../../utils/shared';
import { selectRelationComboboxOption } from './publish-draft-relations-warning.utils';

// Relations UI - global management smoke (@extended)
//
// Existing relation specs only cover "create on the fly" (making a brand-new related entry inline).
// This covers the everyday workflow of managing relations to EXISTING entries through the edit view:
// observe a seeded relation, connect another, persist across reload, see the inverse side, and remove
// — on a bidirectional many-to-many (Article.authors <-> Author.articles).
//
// The with-admin fixture already links the "West Ham" article to "Coach Beard"; "Ted Lasso" is not
// linked, so the test connects it and later removes it again.
const ARTICLE = 'West Ham post match analysis';
const SEEDED_AUTHOR = 'Coach Beard';
const ADDED_AUTHOR = 'Ted Lasso';
const INITIAL_PRODUCT_ORDER = ['First product', 'Second product', 'Third product'];
const UPDATED_PRODUCT_ORDER = [
  'Third product',
  'Second product',
  'Fourth product',
  'Fifth product',
];

const relationRow = (page: Page, name: string) =>
  page
    .getByRole('button', { name, exact: true })
    .locator('xpath=ancestor::li[@aria-describedby][1]');

const expectRelationOrder = async (page: Page, names: string[]) => {
  for (let index = 0; index < names.length - 1; index += 1) {
    expect(
      await isElementBefore(relationRow(page, names[index]), relationRow(page, names[index + 1]))
    ).toBe(true);
  }
};

const createPublishedProduct = async (page: Page, name: string) => {
  await navToHeader(page, ['Content Manager', 'Products'], 'Products');
  await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());
  await page.getByRole('textbox', { name: 'name' }).fill(name);
  await page
    .getByRole('textbox', { name: 'slug' })
    .fill(`relations-${name.toLowerCase().replaceAll(' ', '-')}`);
  await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
  await findAndClose(page, 'Saved Document');
  await withContentManagerPublish(page, () =>
    page.getByRole('button', { name: 'Publish', exact: true }).click()
  );
  await findAndClose(page, 'Published Document');
};

const selectProduct = async (page: Page, name: string) => {
  await page.getByRole('combobox', { name: /products/ }).click();
  await selectRelationComboboxOption(page, name, 'published');
};

const openProductCarousel = async (page: Page) => {
  await page.getByRole('button', { name: 'Product carousel - 23/24 kits' }).click();
};

test.describe('Relations UI - manage relations to existing entries', { tag: ['@extended'] }, () => {
  test.describe.configure({ timeout: 300000 });

  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
    await login({ page });
  });

  // Connect an existing author via the relation combobox. Options are labelled "<name> <status>"
  // (e.g. "Ted Lasso draft"), so match by substring rather than exact.
  const connectAuthor = async (page: Page, name: string) => {
    await page.getByRole('combobox', { name: 'authors' }).click();
    await page.getByRole('option', { name }).click();
  };

  const openArticle = async (page: Page) => {
    await navToHeader(page, ['Content Manager', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('gridcell', { name: ARTICLE }));
  };

  test('connect, persist, reflect on the inverse side, and remove a many-to-many relation', async ({
    page,
  }) => {
    await openArticle(page);

    // Baseline: the fixture already links one author. Connected relations render as buttons.
    await expect(page.getByRole('button', { name: SEEDED_AUTHOR })).toBeVisible();

    // 1. Connect a second existing author.
    await connectAuthor(page, ADDED_AUTHOR);
    await expect(page.getByRole('button', { name: ADDED_AUTHOR })).toBeVisible();

    // 2. Save.
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved Document');

    // 3. Inverse side: the added author now lists the article — this only reflects once the
    //    relation is persisted, so it also proves the save stuck.
    await navToHeader(page, ['Content Manager', 'Author'], 'Author');
    await clickAndWait(page, page.getByRole('gridcell', { name: ADDED_AUTHOR, exact: true }));
    await expect(page.getByRole('button', { name: ARTICLE })).toBeVisible();

    // 4. Re-open the article from scratch (fresh fetch) — both relations persisted — then remove
    //    the added one. (Re-navigation rather than page.reload(), which crashes webkit here.)
    await openArticle(page);
    await expect(page.getByRole('button', { name: SEEDED_AUTHOR })).toBeVisible();
    await expect(page.getByRole('button', { name: ADDED_AUTHOR })).toBeVisible();
    const rowToRemove = page.getByRole('listitem').filter({ hasText: ADDED_AUTHOR });
    await rowToRemove.getByRole('button', { name: 'Remove' }).click();
    await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
    await findAndClose(page, 'Saved Document');

    // 5. Re-open again — the removal persisted: the seeded author remains, the added one is gone.
    await openArticle(page);
    await expect(page.getByRole('button', { name: SEEDED_AUTHOR })).toBeVisible();
    await expect(page.getByRole('button', { name: ADDED_AUTHOR })).toHaveCount(0);
  });

  test('preserves newly added relation order in a dynamic-zone component after save and publish', async ({
    page,
  }) => {
    for (const name of [...INITIAL_PRODUCT_ORDER, 'Fourth product', 'Fifth product']) {
      await createPublishedProduct(page, name);
    }

    await navToHeader(page, ['Content Manager', 'Shop'], 'UK Shop');
    await openProductCarousel(page);

    for (const name of INITIAL_PRODUCT_ORDER) {
      await selectProduct(page, name);
    }

    await withContentManagerSave(page, () => page.getByRole('button', { name: 'Save' }).click());
    await findAndClose(page, 'Saved Document');
    await withContentManagerPublish(page, () =>
      page.getByRole('button', { name: 'Publish' }).click()
    );
    await findAndClose(page, 'Published Document');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('tab', { name: 'Draft' })).toHaveAttribute('aria-selected', 'true');
    await openProductCarousel(page);
    await expectRelationOrder(page, INITIAL_PRODUCT_ORDER);

    await relationRow(page, 'First product').getByRole('button', { name: 'Remove' }).click();
    await selectProduct(page, 'Fourth product');
    await selectProduct(page, 'Fifth product');
    await relationRow(page, 'Third product').getByRole('button', { name: 'Drag' }).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Space');
    await expectRelationOrder(page, UPDATED_PRODUCT_ORDER);

    await withContentManagerSave(page, () => page.getByRole('button', { name: 'Save' }).click());
    await findAndClose(page, 'Saved Document');
    await expectRelationOrder(page, UPDATED_PRODUCT_ORDER);
    await expect(page.getByRole('button', { name: 'First product', exact: true })).toHaveCount(0);

    await withContentManagerPublish(page, () =>
      page.getByRole('button', { name: 'Publish' }).click()
    );
    await findAndClose(page, 'Published Document');
    await clickAndWait(page, page.getByRole('tab', { name: 'Published' }));
    await openProductCarousel(page);
    await expectRelationOrder(page, UPDATED_PRODUCT_ORDER);
    await expect(page.getByRole('button', { name: 'First product', exact: true })).toHaveCount(0);
  });
});
