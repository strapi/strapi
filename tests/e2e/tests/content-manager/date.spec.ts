import { test, expect } from '@playwright/test';
import { clickAndWait } from '../../utils/shared';
import { createContent } from '../../utils/content-creation';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { login } from '../../utils/login';

// Helper to get date in MM/DD/YYYY format consistently
function toMMDDYYYY(date: Date) {
  // Always zero-pad month/day:
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${date.getFullYear()}`;
}

test.describe('Date field tests', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar');
    await page.goto('/admin');
    await login({ page });

    // Navigate to Content Manager
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
  });

  test('should select the current date from the UI datepicker', async ({ page }) => {
    const today = new Date();
    const zeroPadded = toMMDDYYYY(today);

    await createContent(
      page,
      'Match',
      [
        {
          type: 'date_date',
          name: 'date',
          value: zeroPadded,
        },
      ],
      {
        save: true,
        verify: true,
      }
    );

    // Double-check the final input value
    const dateValue = await page.getByLabel('date').inputValue();
    expect(dateValue).toBe(zeroPadded);
  });

  test('should select a future date by directly filling the input (skipping UI clicks)', async ({
    page,
  }) => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1); // go 1 year in the future
    const zeroPaddedFuture = toMMDDYYYY(future);

    await createContent(
      page,
      'Match',
      [
        {
          type: 'date_date',
          name: 'date',
          value: zeroPaddedFuture,
        },
      ],
      {
        save: true,
        verify: true,
      }
    );

    const dateValue = await page.getByLabel('date').inputValue();
    expect(dateValue).toBe(zeroPaddedFuture);
  });

  test('should handle an ISO-formatted date properly', async ({ page }) => {
    // Using ISO string to avoid locale/timezone parsing issues
    const isoString = '2025-01-09';

    const date = new Date(isoString);
    const zeroPaddedDate = toMMDDYYYY(date);

    await createContent(
      page,
      'Match',
      [
        {
          type: 'date_date',
          name: 'date',
          value: zeroPaddedDate,
        },
      ],
      {
        save: true,
        verify: true,
      }
    );

    const dateValue = await page.getByLabel('date').inputValue();
    expect(dateValue).toBe(zeroPaddedDate);
  });
});
