import { test as base, expect } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { ContentManagerPage } from './page-objects/ContentManagerPage';
import { ReleasesPage } from './page-objects/ReleasesPage';
import { ReleaseDetailsPage } from './page-objects/ReleaseDetailsPage';

// The seeded release's name, imported by the specs that use it
export const releaseName = 'Trent Crimm: The Independent';

/**
 * Page objects a test can request by name. Built lazily: only if a test names it.
 */
type PageObjectFixtures = {
  cm: ContentManagerPage;
  releases: ReleasesPage;
  details: ReleaseDetailsPage;
};

/**
 * Page objects only, for specs that run their own setup (e.g. the releases list, which resets
 * files because one test edits a content type).
 */
export const testWithPageObjects = base.extend<PageObjectFixtures>({
  cm: async ({ page }, use) => {
    await use(new ContentManagerPage(page));
  },
  releases: async ({ page }, use) => {
    await use(new ReleasesPage(page));
  },
  details: async ({ page }, use) => {
    await use(new ReleaseDetailsPage(page));
  },
});

/**
 * Page objects, and every test starts logged in on a freshly imported `with-admin` database.
 * `loggedInSetup` is an `auto` fixture: it runs for every test in files using this `test`, even
 * ones that don't name it.
 */
export const testLoggedIn = testWithPageObjects.extend<{ loggedInSetup: void }>({
  loggedInSetup: [
    async ({ page }, use) => {
      await resetDatabaseAndImportDataFromPath('with-admin');
      await page.goto('/admin');
      await login({ page });
      await use();
    },
    { auto: true },
  ],
});

/**
 * Like `testLoggedIn`, and every test starts on the seeded release's details page.
 */
export const test = testLoggedIn.extend<{ releasePageSetup: void }>({
  releasePageSetup: [
    // Naming `loggedInSetup` makes it run first: Playwright orders fixtures by dependency
    async ({ loggedInSetup, releases }, use) => {
      await releases.goto();
      await releases.openRelease(releaseName);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
