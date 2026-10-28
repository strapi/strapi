import {
  clickAndWait,
  describeOnCondition,
  findAndClose,
  navToHeader,
} from '../../../utils/shared';
import { waitForRestart } from '../../../utils/restart';
import { resetFiles } from '../../../utils/file-reset';
import { sharedSetup } from '../../../utils/setup';
import { testWithPageObjects as test, expect, releaseName as PENDING_RELEASE } from './fixtures';
import { createReleaseOfMatches, publishRelease, waitForScheduledRun } from './release-api';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

// Seeded by the `with-admin` import: released, and the least recently updated release
const OLDEST_RELEASE = 'Nate: A wonder kid';

const READY_MATCH = { kit_man: 'Will Kitman', opponent: 'West Ham' };
// Publishing a match requires its opponent
const NOT_READY_MATCHES = [{ kit_man: 'Nathan Shelley' }, { kit_man: 'Roy Kent' }];

// The browser's zone, set by `timezoneId` in the Playwright config
const BROWSER_TIMEZONE = 'Europe/Paris';

/**
 * The absolute date and time of the schedule column, as the list formats it in the given zone
 */
const formatScheduleTime = (date: Date, timeZone: string) =>
  `${date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone })} • ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hourCycle: 'h23', timeZone })}`;

describeOnCondition(edition === 'EE')('Releases page', () => {
  test.beforeEach(async ({ page }) => {
    await sharedSetup('history-spec', page, {
      login: true,
      resetFiles: true,
      importData: 'with-admin',
      resetAlways: true, // NOTE: this makes tests extremely slow, but it's necessary to ensure isolation between tests
    });
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test('a pending release shows how many of its entries are ready, and its release mode decides its status', async ({
    page,
    releases,
  }) => {
    await createReleaseOfMatches(page, {
      name: 'Derby day',
      releaseCondition: 'all_or_nothing',
      matches: [READY_MATCH, ...NOT_READY_MATCHES],
    });
    await createReleaseOfMatches(page, {
      name: 'Charity match',
      releaseCondition: 'allow_partial',
      matches: [READY_MATCH, ...NOT_READY_MATCHES],
    });

    await releases.goto();

    // Nothing goes out unless every entry is ready
    const allRequired = releases.row('Derby day');
    await expect(allRequired).toContainText('Blocked');
    await expect(allRequired).toContainText('All required');
    await expect(allRequired).toContainText(/3\s+entries/);
    await expect(allRequired).toContainText(/1\s+of\s+3\s+ready/);
    await expect(allRequired).toContainText('Not scheduled');

    // The ready entry can go out on its own
    const partial = releases.row('Charity match');
    await expect(partial).toContainText('Ready');
    await expect(partial).toContainText('Allow partial');
    await expect(partial).toContainText(/1\s+of\s+3\s+ready/);
  });

  test('a release that ran shows its outcome and when it ran, not its readiness', async ({
    page,
    releases,
  }) => {
    const partialId = await createReleaseOfMatches(page, {
      name: 'Cup final',
      releaseCondition: 'allow_partial',
      matches: [READY_MATCH, ...NOT_READY_MATCHES],
    });
    const partialRanAt = await publishRelease(page, partialId);
    const doneId = await createReleaseOfMatches(page, {
      name: 'League opener',
      releaseCondition: 'all_or_nothing',
      matches: [READY_MATCH],
    });
    const doneRanAt = await publishRelease(page, doneId);

    await releases.goto();

    const partial = releases.row('Cup final');
    await expect(partial).toContainText('Partial');
    await expect(partial).toContainText(/3\s+entries/);
    await expect(partial).toContainText(formatScheduleTime(partialRanAt, BROWSER_TIMEZONE));
    await expect(partial).not.toContainText(/of\s+\d+\s+ready/);

    const done = releases.row('League opener');
    await expect(done).toContainText('Done');
    await expect(done).toContainText(/1\s+entry/);
    await expect(done).toContainText(formatScheduleTime(doneRanAt, BROWSER_TIMEZONE));
  });

  test('a scheduled release that could not go out shows as failed', async ({ page, releases }) => {
    // Due seconds after it's set up, with entries that can't be published: nothing goes out then
    const releaseId = await createReleaseOfMatches(page, {
      name: 'Away game',
      releaseCondition: 'all_or_nothing',
      matches: [READY_MATCH, ...NOT_READY_MATCHES],
      schedule: { scheduledAt: () => new Date(Date.now() + 5_000), timezone: BROWSER_TIMEZONE },
    });
    const ranAt = await waitForScheduledRun(page, releaseId);

    await releases.goto();

    const row = releases.row('Away game');
    await expect(row).toContainText('Failed');
    await expect(row).toContainText('All required');
    await expect(row).toContainText(/3\s+entries/);
    await expect(row).toContainText(formatScheduleTime(ranAt, BROWSER_TIMEZONE));
    await expect(row).not.toContainText(/of\s+\d+\s+ready/);
  });

  test('a scheduled release shows its date and time in its own timezone', async ({
    page,
    releases,
  }) => {
    // 23:30 UTC is 08:30 the next morning in Tokyo, and past midnight in the browser's zone
    const scheduledAt = new Date();
    scheduledAt.setUTCDate(scheduledAt.getUTCDate() + 1);
    scheduledAt.setUTCHours(23, 30, 0, 0);
    await createReleaseOfMatches(page, {
      name: 'Tokyo launch',
      releaseCondition: 'all_or_nothing',
      matches: [READY_MATCH],
      schedule: { scheduledAt, timezone: 'Asia/Tokyo' },
    });

    await releases.goto();

    const row = releases.row('Tokyo launch');
    const tokyoTime = `${formatScheduleTime(scheduledAt, 'Asia/Tokyo')} UTC+09:00`;
    await expect(row).toContainText(tokyoTime);
    // Hovering the relative time tells the same time, not the browser's
    await expect(row.locator('time')).toHaveAttribute('title', tokyoTime);
  });

  test('pending and released releases are paginated together, most recently updated first', async ({
    page,
    releases,
  }) => {
    // With the 2 seeded releases, one more than the 16 of a page. Each is released as soon as it's
    // created: the e2e license caps pending releases at 3, and the seed already holds one
    for (let index = 1; index <= 15; index++) {
      const releaseId = await createReleaseOfMatches(page, {
        name: `Sprint ${index}`,
        releaseCondition: 'allow_partial',
        matches: [],
      });
      await publishRelease(page, releaseId);
    }

    await releases.goto();

    await expect(releases.releaseCount(17)).toBeVisible();
    await expect(releases.rows).toHaveCount(16);
    await expect(releases.rows.first()).toContainText('Sprint 15');

    await releases.goToNextPage();

    await expect(releases.rows).toHaveCount(1);
    await expect(releases.row(OLDEST_RELEASE)).toBeVisible();
    await expect(releases.releaseCount(17)).toBeVisible();
  });

  test('a user can open a release from anywhere on its row', async ({
    page,
    releases,
    details,
  }) => {
    await releases.goto();

    await releases.row(PENDING_RELEASE).getByText('Not scheduled').click();

    await page.waitForURL('/admin/plugins/content-releases/*');
    await expect(details.heading(PENDING_RELEASE)).toBeVisible();
  });

  test('A user should be able to create a release without scheduling it and see it first in the list', async ({
    releases,
  }) => {
    await releases.goto();
    await releases.createRelease('The Diamond Dogs');

    await releases.goto();
    await expect(releases.rows.first()).toContainText('The Diamond Dogs');
    await expect(releases.row('The Diamond Dogs')).toContainText('Not scheduled');
  });

  test('A user should be able to create a release with scheduling info and see it first in the list', async ({
    releases,
  }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await releases.goto();
    await releases.createRelease('The Diamond Dogs', { date: tomorrow, time: '08:00' });

    await releases.goto();
    await expect(releases.rows.first()).toContainText('The Diamond Dogs');
    await expect(releases.row('The Diamond Dogs')).not.toContainText('Not scheduled');
  });

  test('A user should be able to perform bulk release on entries', async ({
    page,
    releases,
    cm,
  }) => {
    await test.step('bulk release', async () => {
      await releases.goto();
      await releases.createRelease('The Diamond Dogs');

      // The empty release links to the content manager
      await clickAndWait(page, page.getByRole('link', { name: 'Open the Content Manager' }));
      await page.waitForURL('/admin/content-manager/collection-types/*');
      await expect(page.getByRole('heading', { name: 'Article' })).toBeVisible();

      await cm.addAllEntriesToRelease('The Diamond Dogs', 'unpublish');
    });

    await test.step('releases should be updated in the release column of list view', async () => {
      const releaseColumn = page.getByRole('button', { name: '1 release' });
      await clickAndWait(page, releaseColumn.first());
      await expect(page.getByText('The Diamond Dogs')).toBeVisible();
    });
  });

  test('Should not show "add to release" bulk action for content types without draft & publish enabled', async ({
    page,
  }) => {
    // Publish articles, otherwise they'll be deleted when we disable draft & publish
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await page.getByRole('checkbox', { name: 'Select all entries' }).check();
    await clickAndWait(page, page.getByRole('button', { name: 'Publish' }));
    await page.getByRole('button', { name: 'Publish' }).click();
    const publishConfirmationDialog = page.getByRole('alertdialog', { name: 'Confirmation' });
    await expect(publishConfirmationDialog).toBeVisible();
    await publishConfirmationDialog.getByRole('button', { name: 'Publish' }).click();

    await findAndClose(page, 'Published document');

    // Disable draft & publish for the Article content type
    await navToHeader(page, ['Content-Type Builder', 'Article'], 'Article');
    await clickAndWait(page, page.getByRole('button', { name: 'Edit', exact: true }));
    await clickAndWait(page, page.getByRole('tab', { name: /advanced settings/i }));
    await page.getByLabel('Draft & publish').click();
    const ctbConfirmationDialog = page.getByRole('alertdialog', { name: 'Confirmation' });
    await expect(ctbConfirmationDialog).toBeVisible();
    await ctbConfirmationDialog.getByRole('button', { name: /disable/i }).click();
    await clickAndWait(page, page.getByRole('button', { name: 'Finish' }));

    await page.getByRole('button', { name: 'Save' }).click();
    await waitForRestart(page);

    // Go to the content manager and bulk select articlesto make sure the "add to release" does not show up
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await expect(page.getByRole('heading', { name: 'Article' })).toBeVisible();
    await page.getByRole('checkbox', { name: 'Select all entries' }).check();
    await expect(page.getByRole('button', { name: /add to release/i })).not.toBeVisible();
  });
});
