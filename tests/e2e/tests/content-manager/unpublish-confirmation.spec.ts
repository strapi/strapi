import { test, expect, type Request } from '@playwright/test';

import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { loginWithApi } from '../../../utils/login';
import {
  findAndClose,
  withContentManagerPublish,
  withContentManagerSave,
} from '../../../utils/shared';

const ARTICLE_PATH = '/content-manager/collection-types/api::article.article';

const scenarios = ['single click', 'rapid double-click', 'delayed network'] as const;

// Regression for https://github.com/strapi/strapi/issues/28506.
test.describe('Unpublish confirmation sends only one request', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await loginWithApi({ page });
    await page.goto(`/admin${ARTICLE_PATH}/create`);

    // Use a fresh document without relations; never depend on manually created records.
    await page.getByRole('textbox', { name: 'title', exact: true }).fill('Unpublish race test');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await findAndClose(page, 'Saved Document');
    await withContentManagerPublish(page, () =>
      page.getByRole('button', { name: 'Publish', exact: true }).click()
    );
    await findAndClose(page, 'Published Document');

    await page
      .getByRole('textbox', { name: 'title', exact: true })
      .fill('Unpublish race test with saved draft changes');
    await withContentManagerSave(page, () =>
      page.getByRole('button', { name: 'Save', exact: true }).click()
    );
    await findAndClose(page, 'Saved Document');
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
    await expect(page.getByRole('tab', { name: /^published$/i })).toBeEnabled();
    await expect(page.getByRole('status', { name: 'modified', exact: true })).toBeVisible();
  });

  for (const scenario of scenarios) {
    test(`${scenario}: exactly one unpublish request per confirmation`, async ({
      page,
    }, testInfo) => {
      const documentPath = new URL(page.url()).pathname.replace(/^\/admin/, '');
      const unpublishPath = `${documentPath}/actions/unpublish`;
      const matchesUnpublish = (request: Request) =>
        request.method() === 'POST' &&
        decodeURIComponent(new URL(request.url()).pathname) === decodeURIComponent(unpublishPath);

      const startedAt = Date.now();
      const requests = new Map<
        Request,
        {
          url: string;
          elapsedMs: number;
          status: number | null;
          finished: boolean;
          failure: string | null;
        }
      >();
      page.on('request', (request) => {
        if (matchesUnpublish(request)) {
          requests.set(request, {
            url: request.url(),
            elapsedMs: Date.now() - startedAt,
            status: null,
            finished: false,
            failure: null,
          });
        }
      });
      page.on('response', (response) => {
        const record = requests.get(response.request());
        if (record) record.status = response.status();
      });
      page.on('requestfinished', (request) => {
        const record = requests.get(request);
        if (record) record.finished = true;
      });
      page.on('requestfailed', (request) => {
        const record = requests.get(request);
        if (record) {
          record.finished = true;
          record.failure = request.failure()?.errorText ?? 'Request failed';
        }
      });

      if (scenario === 'delayed network') {
        await page.route(
          (url) => decodeURIComponent(url.pathname) === decodeURIComponent(unpublishPath),
          async (route) => {
            // Exercise the real backend, holding its response so the modal stays open.
            const response = await route.fetch();
            await new Promise((resolve) => {
              setTimeout(resolve, 400);
            });
            await route.fulfill({ response });
          }
        );
      }

      await page.getByRole('button', { name: 'More document actions', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Unpublish', exact: true }).click();
      const dialog = page.getByRole('alertdialog', { name: 'Confirmation', exact: true });
      await expect(dialog).toBeVisible();
      // These choices distinguish the Modified flow from direct unpublish and bulk dialogs.
      await expect(
        dialog.getByRole('radio', { name: 'Unpublish and keep last draft', exact: true })
      ).toBeChecked();
      await expect(
        dialog.getByRole('radio', { name: 'Unpublish and replace last draft', exact: true })
      ).toBeVisible();
      const confirm = dialog.getByRole('button', { name: 'Confirm', exact: true });
      const notificationRegion = page.getByRole('region', { name: /^Notifications/ });
      let secondClick: string | null = null;
      let notifications: string[] = [];

      try {
        if (scenario === 'rapid double-click') {
          await confirm.dblclick();
        } else if (scenario === 'delayed network') {
          await confirm.click();
          // Deliberate gesture spacing, not a wait for application state.
          await page.waitForTimeout(150);
          if ((await confirm.isVisible()) && (await confirm.isEnabled())) {
            const box = await confirm.boundingBox();
            expect(
              box,
              'The enabled confirmation button should have a click target'
            ).not.toBeNull();
            // Real pointer input: do not auto-wait for a disabled button to become enabled again.
            await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
            secondClick = 'sent while the first response was delayed';
          } else {
            secondClick = 'prevented: confirmation was disabled or closed';
          }
        } else {
          await confirm.click();
        }

        await expect
          .poll(
            () => requests.size > 0 && [...requests.values()].every((record) => record.finished),
            {
              message: 'All observed unpublish requests should finish',
            }
          )
          .toBe(true);
        await expect(dialog).toBeHidden();
        await expect(page.getByRole('tab', { name: /^published$/i })).toBeDisabled();
        await expect(
          page.getByRole('status').filter({ hasText: 'Unpublished document' })
        ).toBeVisible();
        notifications = await notificationRegion
          .getByRole('status')
          .or(notificationRegion.getByRole('alert'))
          .allTextContents();

        expect(
          requests.size,
          `Issue #28506: ${scenario} must send exactly one unpublish request per confirmation`
        ).toBe(1);
        expect([...requests.values()].map(({ status }) => status)).toEqual([200]);
        await expect(
          notificationRegion.getByRole('alert').filter({ hasText: 'Entity not found' })
        ).toHaveCount(0);
        // The default Keep draft choice should retain the saved changes after unpublishing.
        await page.reload();
        await expect(page.getByRole('tab', { name: /^published$/i })).toBeDisabled();
        await expect(page.getByRole('textbox', { name: 'title', exact: true })).toHaveValue(
          'Unpublish race test with saved draft changes'
        );
      } finally {
        const evidence = {
          scenario,
          secondClick,
          requestCount: requests.size,
          requests: [...requests.values()],
          notifications,
        };
        console.log(`Unpublish confirmation evidence: ${JSON.stringify(evidence)}`);
        await testInfo.attach('unpublish-requests.json', {
          body: JSON.stringify(evidence, null, 2),
          contentType: 'application/json',
        });
      }
    });
  }
});
