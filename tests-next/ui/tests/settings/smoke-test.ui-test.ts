import { expect, test } from '../../fixtures';
import { SettingsPage } from '../../pages';

// The pages of the Settings menu, by section, as the legacy smoke test opened them. `@smoke`: it
// runs in CE and EE runs, like before. The EE-only features show a purchase page in CE, with the
// same title.
const PAGES: Array<[section: string, name: string]> = [
  ['Global Settings', 'API Tokens'],
  ['Global Settings', 'Internationalization'],
  ['Global Settings', 'Media Library'],
  ['Global Settings', 'Single Sign-On'],
  ['Global Settings', 'Transfer Tokens'],
  ['Global Settings', 'Webhooks'],
  ['Administration panel', 'Roles'],
  ['Administration panel', 'Users'],
  ['Users & Permissions plugin', 'Roles'],
  ['Users & Permissions plugin', 'Providers'],
  ['Users & Permissions plugin', 'Email templates'],
  ['Users & Permissions plugin', 'Advanced settings'],
  ['Global Settings', 'Review Workflows'],
  ['Administration panel', 'Audit Logs'],
];

const EE_PAGES: Array<[section: string, name: string]> = [
  ['Global Settings', 'Review Workflows'],
  ['Administration panel', 'Audit Logs'],
];

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
  });

  test('every expected feature is displayed', { tag: '@smoke' }, async ({ page }) => {
    const settings = new SettingsPage(page);

    await settings.open();

    for (const [section, name] of PAGES) {
      await settings.openPage(section, name);
      await expect(settings.heading(name)).toBeVisible();
    }
  });

  test.describe(() => {
    test.use({ requires: { ee: ['review-workflows', 'audit-logs'] } });

    test('every EE feature is displayed', { tag: '@ee' }, async ({ page }) => {
      const settings = new SettingsPage(page);

      await settings.open();

      for (const [section, name] of EE_PAGES) {
        await settings.openPage(section, name);
        await expect(settings.heading(name)).toBeVisible();
      }
    });
  });
});
