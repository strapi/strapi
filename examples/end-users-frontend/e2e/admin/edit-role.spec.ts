import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  expectRoleEditor,
  openRoleEditor,
  openSettings,
  settingsButton,
  signInAdmin,
} from './helpers.ts';

/** The conditions select of the Delete row, in the Settings dialog of a content type */
const deleteConditions = (dialog: Locator) =>
  dialog.getByRole('combobox', { name: 'Can Delete When' });

/**
 * The tags of what is selected. The Design System MultiSelect shows "N currently selected" in its
 * combobox and renders each selection as a tag beside it; with the list closed, "Is owner" in the
 * dialog is that tag, and only the Delete row has it selected.
 */
const isOwnerTag = (dialog: Locator) => dialog.getByText('Is owner', { exact: true });

/** Ticks or unticks "Is owner" in the select of Delete, and closes the select */
const toggleIsOwnerUnderDelete = async (page: Page, dialog: Locator) => {
  await deleteConditions(dialog).click();

  const option = page.getByRole('option', { name: 'Is owner' });
  const wasSelected = (await option.getAttribute('aria-checked')) === 'true';

  await option.click();
  await expect(option).toHaveAttribute('aria-checked', wasSelected ? 'false' : 'true');
  await page.keyboard.press('Escape');
};

/** What the editor shows on Article's Settings button when a condition or a depth is set */
const settingsDot = (page: Page) =>
  page.getByRole('img', { name: 'A condition or a populate depth is set.' });

/**
 * Saves the role. The editor asks for a review first: this checks that the review names the Delete
 * conditions, which is what changed, confirms it, and waits for the server to answer the save.
 */
const saveAfterReview = async (page: Page) => {
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  const review = page.getByRole('dialog', { name: /Review changes/ });

  await expect(review).toBeVisible();
  await expect(review).toContainText('Delete conditions');
  await expect(review).toContainText('Is owner');

  const answered = page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' && /\/end-users\/roles\/[^/]+$/.test(response.url())
  );

  await review.getByRole('button', { name: 'Save' }).click();

  expect((await answered).ok()).toBe(true);
  await expect(review).toBeHidden();
};

test('an admin edits a role and the change is kept', async ({ page }) => {
  test.setTimeout(120_000);

  await signInAdmin(page);

  // Roles › Editor. The seed grants it every action on Article, with no condition
  await openRoleEditor(page, 'Editor');

  let dialog = await openSettings(page, 'Article');

  await expect(deleteConditions(dialog)).toHaveText('Anytime');

  // Article › Settings: only the owner may delete
  await toggleIsOwnerUnderDelete(page, dialog);
  await expect(deleteConditions(dialog)).toHaveText('1 currently selected');
  await expect(isOwnerTag(dialog)).toHaveCount(1);
  await dialog.getByRole('button', { name: 'Apply' }).click();
  await expect(dialog).toBeHidden();
  await expect(settingsDot(page)).toHaveCount(1);

  await saveAfterReview(page);

  // Kept: a reload loads the role from the server
  await page.reload();
  await expectRoleEditor(page);
  await expect(settingsDot(page)).toHaveCount(1);

  dialog = await openSettings(page, 'Article');
  await expect(deleteConditions(dialog)).toHaveText('1 currently selected');
  await expect(isOwnerTag(dialog)).toHaveCount(1);

  // Back to the seed, so that nothing a later spec reads has changed
  await toggleIsOwnerUnderDelete(page, dialog);
  await dialog.getByRole('button', { name: 'Apply' }).click();
  await expect(dialog).toBeHidden();

  await saveAfterReview(page);

  dialog = await openSettings(page, 'Article');
  await expect(deleteConditions(dialog)).toHaveText('Anytime');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await expect(settingsDot(page)).toHaveCount(0);
});

for (const width of [1440, 1920]) {
  test(`the Settings button keeps clear of the Publish checkbox and stays in its card at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await page.setViewportSize({ width, height: 1000 });
    await signInAdmin(page);
    await openRoleEditor(page, 'Editor');

    // Article is the content type the seed grants every action on, Publish included
    await page.getByRole('button', { name: 'Article', exact: true }).click();

    // The admin names only the checkboxes of types with field permissions ("Select Find Article
    // permission"); Article's Delete, Read drafts and Publish are not named. Publish is the one in
    // the column of the header's "Select all Publish permissions".
    const row = page
      .locator('div')
      .filter({ has: page.getByRole('checkbox', { name: 'Select Find Article permission' }) })
      .filter({ has: page.getByRole('checkbox', { name: 'Select Update Article permission' }) })
      .last();
    const columnCentre = async (checkbox: Locator) => {
      const box = await checkbox.boundingBox();

      return box ? box.x + box.width / 2 : null;
    };
    const publishX = await columnCentre(
      page.getByRole('checkbox', { name: 'Select all Publish permissions' })
    );

    expect(publishX).not.toBeNull();

    let publish: Locator | undefined;

    for (const checkbox of await row.getByRole('checkbox').all()) {
      const x = await columnCentre(checkbox);

      if (x !== null && Math.abs(x - publishX!) < 8) {
        publish = checkbox;
        break;
      }
    }

    expect(publish, "Article's Publish checkbox sits under the Publish column").toBeDefined();

    const heading = page.getByRole('heading', { name: 'Routes bound to Article' });
    const settings = settingsButton(page, 'Article');

    await expect(heading).toBeVisible();
    await expect(publish!).toBeVisible();
    await expect(publish!).toBeChecked();

    const publishBox = await publish!.boundingBox();
    const settingsBox = await settings.boundingBox();

    expect(publishBox).not.toBeNull();
    expect(settingsBox).not.toBeNull();

    const [a, b] = [publishBox!, settingsBox!];
    const intersects =
      a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

    expect(intersects).toBe(false);

    // The table scrolls inside its card when its rows are wider than it: the button, brought into
    // view, lies inside the card's box rather than past its edge
    const card = page.getByRole('tabpanel').filter({ has: heading });

    await settings.scrollIntoViewIfNeeded();

    const cardBox = await card.boundingBox();
    const inView = await settings.boundingBox();

    expect(cardBox).not.toBeNull();
    expect(inView).not.toBeNull();
    expect(inView!.x).toBeGreaterThanOrEqual(cardBox!.x);
    expect(inView!.x + inView!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width);
    expect(inView!.y).toBeGreaterThanOrEqual(cardBox!.y);
    expect(inView!.y + inView!.height).toBeLessThanOrEqual(cardBox!.y + cardBox!.height);

    // and the page itself does not scroll sideways
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
      )
    ).toBe(true);

    // The routes of the open type are inside its row: below its button, above the next type's
    const articleBox = await page
      .getByRole('button', { name: 'Article', exact: true })
      .boundingBox();
    const headingBox = await heading.boundingBox();
    const nextBox = await page.getByRole('button', { name: 'Profile', exact: true }).boundingBox();

    expect(headingBox!.y).toBeGreaterThan(articleBox!.y);
    expect(headingBox!.y).toBeLessThan(nextBox!.y);
  });
}
