import { test, expect } from '@playwright/test';
import { sharedSetup } from '../../utils/setup';
import { addAttributesToContentType } from '../../utils/content-types';
import { clickAndWait } from '../../utils/shared';
import { createContent } from '../../utils/content-creation';
import { resetFiles } from '../../utils/file-reset';

// Helper to get date in MM/DD/YYYY format consistently
function toMMDDYYYY(date: Date) {
  // Always zero-pad month/day:
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${date.getFullYear()}`;
}

test.describe('Date field tests', () => {
  test.beforeEach(async ({ page }) => {
    await sharedSetup('ctb-edit-st', page, {
      login: true,
      skipTour: true,
      resetFiles: true,
      importData: 'with-admin.tar',
      afterSetup: async ({ page }) => {
        // Adds a date attribute to the 'Article' content type
        await addAttributesToContentType(page, 'Article', [
          {
            type: 'date',
            name: 'date',
            date: {
              format: 'date', // set to "date" so we only deal with the date (no time)
            },
          },
        ]);
      },
    });

    // Navigate to Content Manager
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
  });

  test.afterAll(async () => {
    await resetFiles();
  });

  test('should select the current date from the UI datepicker', async ({ page }) => {
    const today = new Date();
    const zeroPadded = toMMDDYYYY(today);

    await createContent(
      page,
      'Article',
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
      'Article',
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
      'Article',
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
