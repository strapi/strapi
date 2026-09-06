import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { login } from '../../../utils/login';
import { navToHeader } from '../../../utils/shared';
import { resetDatabaseAndImportDataFromPath } from '../../../utils/dts-import';
import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD } from '../../constants';

// Critical path #21 — cm.advanced-filters (@extended)
//
// For a representative set of operators on a text field, assert the list-view filter UI and a direct
// API query with the equivalent filter return the same set of rows.
//
// Uses Author: non-localized (no locale confound) with three distinct seeded names — Ted Lasso,
// Coach Beard, Led Tasso. The API side uses the admin content-manager endpoint (the same data source
// the list view reads), so the comparison validates that the filter UI builds a query whose result
// set matches the API's.
const AUTHOR_UID = 'api::author.author';

const cases = [
  {
    operatorLabel: 'contains',
    query: 'filters[name][$contains]=Lasso',
    value: 'Lasso',
    expected: ['Ted Lasso'],
  },
  {
    operatorLabel: 'is',
    query: `filters[name][$eq]=${encodeURIComponent('Coach Beard')}`,
    value: 'Coach Beard',
    expected: ['Coach Beard'],
  },
  {
    operatorLabel: 'is not',
    query: `filters[name][$ne]=${encodeURIComponent('Ted Lasso')}`,
    value: 'Ted Lasso',
    expected: ['Coach Beard', 'Led Tasso'],
  },
] as const;

const ALL_AUTHORS = ['Ted Lasso', 'Coach Beard', 'Led Tasso'];

test.describe('Content Manager - advanced filters', { tag: ['@extended'] }, () => {
  test.describe.configure({ timeout: 300000 });

  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
    await login({ page });
  });

  const applyFilter = async (
    page: Page,
    fieldLabel: string,
    operatorLabel: string,
    value: string
  ) => {
    await page.getByRole('button', { name: 'Filters' }).click();
    await page.getByRole('combobox', { name: 'Select field' }).click();
    await page.getByRole('option', { name: fieldLabel, exact: true }).click();
    await page.getByRole('combobox', { name: 'Select filter' }).click();
    await page.getByRole('option', { name: operatorLabel, exact: true }).click();
    await page.getByRole('textbox', { name: fieldLabel }).fill(value);
    await page.getByRole('button', { name: 'Add filter' }).click();
  };

  const apiFilterNames = async (
    request: APIRequestContext,
    headers: Record<string, string>,
    query: string
  ) => {
    const res = await request.get(`/content-manager/collection-types/${AUTHOR_UID}?${query}`, {
      headers,
    });
    expect(res.ok(), `admin CM query failed: ${query}`).toBeTruthy();
    return (await res.json()).results.map((r: any) => r.name).sort();
  };

  test('list-view filters and the API return the same rows for each operator', async ({ page }) => {
    const adminLogin = await page.request.post('/admin/login', {
      data: { email: ADMIN_EMAIL_ADDRESS, password: ADMIN_PASSWORD },
    });
    const adminToken = (await adminLogin.json()).data?.token;
    expect(adminToken, 'admin API login failed').toBeTruthy();
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // Sanity: all three authors are present before filtering.
    await navToHeader(page, ['Content Manager', 'Author'], 'Author');
    for (const name of ALL_AUTHORS) {
      await expect(page.getByRole('gridcell', { name, exact: true })).toBeVisible();
    }

    for (const { operatorLabel, query, value, expected } of cases) {
      await test.step(`name ${operatorLabel} "${value}"`, async () => {
        await applyFilter(page, 'name', operatorLabel, value);

        // The filter is applied — its chip is shown.
        const chip = page.getByRole('button', { name: `name ${operatorLabel} ${value}` });
        await expect(chip).toBeVisible();

        // UI: exactly the expected rows are shown.
        for (const name of ALL_AUTHORS) {
          const cell = page.getByRole('gridcell', { name, exact: true });
          if (expected.includes(name)) {
            await expect(cell, `${name} should be visible`).toBeVisible();
          } else {
            await expect(cell, `${name} should be filtered out`).toHaveCount(0);
          }
        }

        // API: the equivalent query returns the same set of rows.
        const apiNames = await apiFilterNames(page.request, adminHeaders, query);
        expect(apiNames, `API rows for "${operatorLabel}"`).toEqual([...expected].sort());

        // Remove the filter chip so the next case starts from an unfiltered list.
        // (The CM persists the list query, so navigating wouldn't clear it.)
        await chip.click();
        await expect(chip).toHaveCount(0);
        await expect(page.getByRole('gridcell', { name: 'Ted Lasso', exact: true })).toBeVisible();
      });
    }
  });
});
