import { type Page } from '@playwright/test';
import { test, expect } from '../../../fixtures';
import { login } from '../../../utils/login';
import { navToHeader } from '../../../utils/shared';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD } from '../../constants';

// [EE-290] A date-time filter takes a date and an optional time: a date alone matches that day,
// a date and a time match that minute, whatever the seconds and milliseconds of the stored value.
const AUTHOR_UID = 'api::author.author';
const NEW_AUTHOR = 'Roy Kent';

test.describe('Content Manager - date-time filters', () => {
  let createdAt: string;

  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');

    const adminLogin = await page.request.post('/admin/login', {
      data: { email: ADMIN_EMAIL_ADDRESS, password: ADMIN_PASSWORD },
    });
    const { token } = (await adminLogin.json()).data;
    const created = await page.request.post(`/content-manager/collection-types/${AUTHOR_UID}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: NEW_AUTHOR },
    });
    expect(created.ok(), 'creating the author failed').toBeTruthy();
    ({ createdAt } = (await created.json()).data);

    await page.goto('/admin');
    await login({ page });
    await navToHeader(page, ['Content Manager', 'Author'], 'Author');
  });

  // The day and the minute as the browser shows them: filters use the viewer's time zone
  const toLocal = (page: Page, iso: string, offsetMs = 0) =>
    page.evaluate(
      ([value, offset]) => {
        const date = new Date(new Date(value).getTime() + offset);
        const pad = (number: number) => String(number).padStart(2, '0');

        return {
          day: `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`,
          time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
        };
      },
      [iso, offsetMs] as const
    );

  const applyCreatedAtFilter = async (
    page: Page,
    operatorLabel: string,
    { day, time }: { day: string; time?: string }
  ) => {
    await page.getByRole('button', { name: 'Filters' }).click();
    await page.getByRole('combobox', { name: 'Select field' }).click();
    await page.getByRole('option', { name: 'createdAt', exact: true }).click();
    await page.getByRole('combobox', { name: 'Select filter' }).click();
    await page.getByRole('option', { name: operatorLabel, exact: true }).click();
    // Clicking opens the calendar: Enter then picks the typed day instead of submitting the form
    const dateInput = page.getByRole('combobox', { name: 'createdAt date' });
    await dateInput.click();
    await dateInput.pressSequentially(day);
    await page.keyboard.press('Enter');
    const timeInput = page.getByRole('combobox', { name: 'createdAt time (optional)' });
    // The picked date enables the time
    await expect(timeInput).toBeEnabled();
    if (time) {
      await timeInput.click();
      await timeInput.pressSequentially(time);
      await page.keyboard.press('Enter');
      // The typed time is kept when the field loses focus
      await timeInput.blur();
      await expect(timeInput).toHaveValue(time);
    }
    await page.getByRole('button', { name: 'Add filter' }).click();
  };

  const newAuthorCell = (page: Page) =>
    page.getByRole('gridcell', { name: NEW_AUTHOR, exact: true });

  const removeFilter = async (page: Page) => {
    await page.getByRole('button', { name: /^createdAt / }).click();
    await expect(newAuthorCell(page)).toBeVisible();
  };

  test('a date alone matches the whole day', async ({ page }) => {
    const created = await toLocal(page, createdAt);
    const dayBefore = await toLocal(page, createdAt, -24 * 60 * 60 * 1000);

    await applyCreatedAtFilter(page, 'is', { day: created.day });
    // The tag shows no time
    await expect(page.getByRole('button', { name: /^createdAt is [^:]+$/ })).toBeVisible();
    await expect(newAuthorCell(page)).toBeVisible();
    await removeFilter(page);

    await applyCreatedAtFilter(page, 'is', { day: dayBefore.day });
    await expect(newAuthorCell(page)).toHaveCount(0);
    await removeFilter(page);

    await applyCreatedAtFilter(page, 'is not', { day: created.day });
    await expect(newAuthorCell(page)).toHaveCount(0);
  });

  test('a date and a time match that minute', async ({ page }) => {
    const created = await toLocal(page, createdAt);
    const minuteBefore = await toLocal(page, createdAt, -60 * 1000);

    await applyCreatedAtFilter(page, 'is', created);
    // The tag shows the time
    await expect(page.getByRole('button', { name: /^createdAt is .+:/ })).toBeVisible();
    await expect(newAuthorCell(page)).toBeVisible();
    await removeFilter(page);

    await applyCreatedAtFilter(page, 'is', minuteBefore);
    await expect(newAuthorCell(page)).toHaveCount(0);
  });
});
