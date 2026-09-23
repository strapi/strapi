import { test as base, expect } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { ContentManagerPage } from './page-objects/ContentManagerPage';
import { ReleasesPage } from './page-objects/ReleasesPage';
import { ReleaseDetailsPage } from './page-objects/ReleaseDetailsPage';

// Single source of truth for the seeded release name (imported by the spec too).
export const releaseName = 'Trent Crimm: The Independent';

/**
 * The custom fixtures this project's tests can request by name.
 * - value fixtures (cm/releases/details): hand back a ready page object.
 * - releasePageSetup: an `auto` fixture (runs for every test) that reproduces
 *   the old `beforeEach`. It returns nothing, so its type is `void`.
 */
type ReleaseFixtures = {
  cm: ContentManagerPage;
  releases: ReleasesPage;
  details: ReleaseDetailsPage;
  releasePageSetup: void;
};

export const test = base.extend<ReleaseFixtures>({
  // ── Value fixtures ──────────────────────────────────────────────────────
  // Each depends on the built-in `page`, constructs one POM bound to it, and
  // hands it to the test via `use`. Built lazily: only if a test names it.
  cm: async ({ page }, use) => {
    await use(new ContentManagerPage(page));
  },
  releases: async ({ page }, use) => {
    await use(new ReleasesPage(page));
  },
  details: async ({ page }, use) => {
    await use(new ReleaseDetailsPage(page));
  },

  // ── Auto setup fixture ──────────────────────────────────────────────────
  // `auto: true` → runs for EVERY test in files using this `test`, even ones
  // that don't name it. Depends on `releases` so the navigation reuses the POM
  // (fixture composition). Everything before `use()` is setup; there's no
  // teardown here. This replaces the spec's `beforeEach` verbatim.
  releasePageSetup: [
    async ({ page, releases }, use) => {
      await resetDatabaseAndImportDataFromPath('with-admin');
      await page.goto('/admin');
      await login({ page });
      await releases.goto();
      await releases.openRelease(releaseName);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
