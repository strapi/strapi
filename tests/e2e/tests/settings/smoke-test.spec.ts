import { test } from '@playwright/test';

import { login } from '../../utils/login';
import { describeOnCondition, navToHeader } from '../../utils/shared';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });
  });

  test('every expected feature is displayed', async ({ page }) => {
    await navToHeader(page, ['Settings'], 'Overview');

    await navToHeader(page, ['Settings', 'API Tokens'], 'API Tokens');

    await navToHeader(page, ['Settings', 'Documentation'], 'Documentation');

    await navToHeader(page, ['Settings', 'Internationalization'], 'Internationalization');

    await navToHeader(page, ['Settings', 'Media Library'], 'Media Library');

    await navToHeader(page, ['Settings', 'Single Sign-On'], 'Single Sign-On');

    await navToHeader(page, ['Settings', 'Transfer Tokens'], 'Transfer Tokens');

    await navToHeader(page, ['Settings', 'Webhooks'], 'Webhooks');

    // admin
    await navToHeader(page, ['Settings', ['Administration Panel', 'Roles']], 'Roles');

    await navToHeader(page, ['Settings', ['Administration Panel', 'Users']], 'Users');

    // u&p
    await navToHeader(page, ['Settings', ['Users & Permissions', 'Roles']], 'Roles');

    await navToHeader(page, ['Settings', ['Users & Permissions', 'Providers']], 'Providers');

    await navToHeader(
      page,
      ['Settings', ['Users & Permissions', 'Email templates']],
      'Email templates'
    );

    await navToHeader(
      page,
      ['Settings', ['Users & Permissions', 'Advanced settings']],
      'Advanced settings'
    );

    // EE features should still be displayed because they will show a "purchase" page
    await navToHeader(page, ['Settings', 'Review Workflows'], 'Review Workflows');
    await navToHeader(page, ['Settings', ['Administration Panel', 'Audit Logs']], 'Audit Logs');
  });

  describeOnCondition(edition === 'EE')(() => {
    test('every EE feature is displayed', async ({ page }) => {
      await navToHeader(page, ['Settings', 'Review Workflows'], 'Review Workflows');
      await navToHeader(page, ['Settings', ['Administration Panel', 'Audit Logs']], 'Audit Logs');
    });
  });
});
