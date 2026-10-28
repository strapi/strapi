import { describeOnCondition } from '../../../utils/shared';
import { test, expect } from './fixtures';
import { createReleaseOfMatches } from './release-api';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const RELEASE_NAME = 'Matchday';

// One match the run publishes, and two without the required opponent, which it skips
const PUBLISHED = 'Will Kitman';
const SKIPPED = ['Nathan Shelley', 'Roy Kent'];

describeOnCondition(edition === 'EE')('Release page - skipped entries', () => {
  test.beforeEach(async ({ page, details }) => {
    const releaseId = await createReleaseOfMatches(page, {
      name: RELEASE_NAME,
      releaseCondition: 'allow_partial',
      matches: [
        { kit_man: PUBLISHED, opponent: 'West Ham' },
        ...SKIPPED.map((kit_man) => ({ kit_man })),
      ],
    });

    await details.goto(releaseId);
    await details.publish();
    // Released partially: the page offers to carry the skipped entries over
    await expect(details.createFromSkippedButton).toBeVisible();
    await expect(details.publishButton).toBeHidden();
  });

  test('the page shows what the run did to each entry', async ({ page, details }) => {
    await expect(page.getByText('Released 1 of 3 entries')).toBeVisible();
    await expect(page.getByText('2 skipped', { exact: true })).toBeVisible();
    await expect(details.tab('All', 3)).toBeVisible();
    await expect(details.tab('Released', 1)).toBeVisible();
    await expect(details.tab('Skipped', 2)).toBeVisible();

    await expect(details.entryRow(PUBLISHED).getByText('Done', { exact: true })).toBeVisible();
    for (const name of SKIPPED) {
      await expect(
        details.entryRow(name).getByRole('button', { name: `Why ${name} was skipped` })
      ).toBeVisible();
    }

    await expect(
      details.entryRow(SKIPPED[0]).getByRole('link', { name: 'Open entry' })
    ).toBeVisible();

    await details
      .entryRow(SKIPPED[0])
      .getByRole('button', { name: `Why ${SKIPPED[0]} was skipped` })
      .click();
    const reason = page.getByRole('dialog');
    await expect(reason.getByText('Skipped: Validation error')).toBeVisible();
    await expect(reason.getByText('Opponent', { exact: true })).toBeVisible();
    await expect(reason.getByRole('link', { name: 'Go to entry' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(reason).toBeHidden();

    await details.tab('Skipped').click();
    await expect(page).toHaveURL(/filter=skipped/);
    for (const name of SKIPPED) {
      await expect(details.entryCell(name)).toBeVisible();
    }
    await expect(details.entryCell(PUBLISHED)).toHaveCount(0);
  });

  test('a user can create a new release from the entries a partial release skipped', async ({
    details,
  }) => {
    const drawer = await details.openSkippedEntriesDrawer();

    await expect(drawer.carriedOverHeading(2)).toBeVisible();
    await expect(drawer.entries).toHaveCount(2);
    for (const name of SKIPPED) {
      await expect(drawer.entry(name)).toBeVisible();
    }
    await expect(drawer.entry(PUBLISHED)).toHaveCount(0);
    await expect(drawer.nameInput).toHaveValue(`${RELEASE_NAME} - skipped entries`);
    await expect(drawer.releaseMode('Release all ready items')).toBeChecked();

    await drawer.noScheduleCheckbox.click();
    await drawer.createRelease();

    await expect(details.heading(`${RELEASE_NAME} - skipped entries`)).toBeVisible();
    for (const name of SKIPPED) {
      await expect(details.entryCell(name)).toBeVisible();
    }
    await expect(details.entryCell(PUBLISHED)).toHaveCount(0);
    // It is planned, so it can be published once its entries are fixed
    await expect(details.publishButton).toBeVisible();
  });

  test('an entry removed from the side panel is left out of the new release', async ({
    details,
  }) => {
    const [removed, kept] = SKIPPED;
    const drawer = await details.openSkippedEntriesDrawer();

    await drawer.removeEntry(removed);
    await expect(drawer.carriedOverHeading(1)).toBeVisible();

    await drawer.nameInput.fill('Matchday rematch');
    await drawer.chooseReleaseMode('Release all ready items');
    await drawer.noScheduleCheckbox.click();
    await drawer.createRelease();

    await expect(details.heading('Matchday rematch')).toBeVisible();
    await expect(details.entryCell(kept)).toBeVisible();
    await expect(details.entryCell(removed)).toHaveCount(0);
  });
});
