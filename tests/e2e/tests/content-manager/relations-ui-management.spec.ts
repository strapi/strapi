import { test, expect, type Page } from '@playwright/test';
import { login } from '../../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { clickAndWait, findAndClose, navToHeader } from '../../../utils/shared';

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
});
