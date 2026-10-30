import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import {
  resetDatabaseAndImportDataFromPath,
  resyncSuperAdminPermissionsAfterImport,
} from '../../../utils/dts-import';
import { login } from '../../../utils/login';
import { clickAndWait, findAndClose, navToHeader } from '../../../utils/shared';
import { ADMIN_EMAIL_ADDRESS, ADMIN_PASSWORD } from '../../constants';

/**
 * The UI of the copy (menus, modal, selection, badges) is covered by the front tests, which mock
 * the API. These tests cover what only a real server can prove: the copies are saved as new
 * components of the target, relations included, and the source is left untouched.
 *
 * The entries to copy from are seeded through the admin API rather than added to the `with-admin`
 * packet: other specs list and count the seeded entries.
 */

const PRODUCT_UID = 'api::product.product';
const COMPLEX_UID = 'api::complex.complex';

const SOURCE_PRODUCT = 'Copy source product';
const TARGET_PRODUCT = 'Copy target product';
const VARIATION_NAME = 'Large';
const VARIATION_PRICE = '42';

const SOURCE_COMPLEX = 'Copy source complex';
const TARGET_COMPLEX = 'Copy target complex';
const BLOCK_TEXT = 'Copied block';

const getAdminSession = async (request: APIRequestContext) => {
  const loginResponse = await request.post('/admin/login', {
    data: { email: ADMIN_EMAIL_ADDRESS, password: ADMIN_PASSWORD },
  });
  const { token, user } = (await loginResponse.json()).data;

  return { headers: { Authorization: `Bearer ${token}` }, user };
};

const seedEntry = async (
  request: APIRequestContext,
  headers: Record<string, string>,
  uid: string,
  data: Record<string, unknown>
) => {
  const response = await request.post(`/content-manager/collection-types/${uid}`, {
    headers,
    data,
  });
  expect(response.ok(), `seeding ${uid} failed: ${await response.text()}`).toBeTruthy();
};

const save = async (page: Page) => {
  await clickAndWait(page, page.getByRole('button', { name: 'Save' }));
  await findAndClose(page, 'Saved Document');
};

/**
 * Creates and saves an entry with only its text field filled: copying into a saved entry goes
 * through the update of its components, which refuses components that belong to another entry.
 */
const createTarget = async (
  page: Page,
  contentType: string,
  field: string,
  value: string
): Promise<void> => {
  await navToHeader(page, ['Content Manager', contentType], contentType);
  await clickAndWait(page, page.getByRole('link', { name: 'Create new entry' }).last());
  await page.getByRole('textbox', { name: field, exact: true }).fill(value);
  await save(page);
};

test.describe('Copy components from existing entries', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    // the packet predates `complex`: without a resync the super admin has no permission on it
    await resyncSuperAdminPermissionsAfterImport();
    await page.goto('/admin');
    await login({ page });
  });

  test('As a user I want to copy the components of another entry into a repeatable component and save them as my own', async ({
    page,
  }) => {
    const { headers } = await getAdminSession(page.request);
    await seedEntry(page.request, headers, PRODUCT_UID, {
      name: SOURCE_PRODUCT,
      slug: 'copy-source-product',
      isAvailable: true,
      variations: [{ name: VARIATION_NAME, price: Number(VARIATION_PRICE) }],
    });

    await createTarget(page, 'Products', 'name', TARGET_PRODUCT);

    // the product has two component fields, the variations come last
    await clickAndWait(
      page,
      page.getByRole('button', { name: 'No entry yet. Click to add one.' }).last()
    );
    await clickAndWait(page, page.getByRole('menuitem', { name: 'Use existing content…' }));

    const modal = page.getByRole('dialog', { name: 'Copy existing variations' });
    await modal.getByRole('button', { name: new RegExp(SOURCE_PRODUCT) }).click();
    await expect(modal.getByRole('checkbox', { name: VARIATION_NAME })).toBeChecked();
    await modal.getByRole('button', { name: 'Use content' }).click();
    await findAndClose(page, `1 entry copied from ${SOURCE_PRODUCT}`);

    await save(page);

    /**
     * The copy is saved with the target.
     */
    await page.reload();
    await clickAndWait(page, page.getByRole('button', { name: VARIATION_NAME }));
    await expect(page.getByRole('textbox', { name: 'price' })).toHaveValue(VARIATION_PRICE);

    /**
     * The source keeps its own variation.
     */
    await navToHeader(page, ['Content Manager', 'Products'], 'Products');
    await clickAndWait(page, page.getByRole('gridcell', { name: SOURCE_PRODUCT }));
    await clickAndWait(page, page.getByRole('button', { name: VARIATION_NAME }));
    await expect(page.getByRole('textbox', { name: 'price' })).toHaveValue(VARIATION_PRICE);
  });

  test('As a user I want to copy a dynamic zone component along with its relations', async ({
    page,
  }) => {
    const { headers, user } = await getAdminSession(page.request);
    await seedEntry(page.request, headers, COMPLEX_UID, {
      required: SOURCE_COMPLEX,
      shorttext: SOURCE_COMPLEX,
      dynamic_zone: [
        {
          __component: 'component-category.component',
          shorttext: BLOCK_TEXT,
          user: { connect: [{ id: user.id }] },
        },
      ],
    });

    await createTarget(page, 'Complex Content', 'required', TARGET_COMPLEX);

    await page.getByRole('button', { name: 'Add a component to dynamic_zone' }).click();
    const categoryButton = page.getByRole('button', { name: 'component-category' });
    if ((await categoryButton.getAttribute('data-state')) !== 'open') {
      await categoryButton.click();
    }
    await page.getByRole('button', { name: 'component', exact: true }).click();
    await clickAndWait(page, page.getByRole('menuitem', { name: 'Use existing content…' }));

    const modal = page.getByRole('dialog');
    await modal.getByRole('button', { name: new RegExp(SOURCE_COMPLEX) }).click();
    await modal.getByRole('button', { name: 'Use content' }).click();
    // the component of `complex.dynamic_zone` is named "component"
    await findAndClose(page, `1 component component copied from ${SOURCE_COMPLEX}`);

    await save(page);

    /**
     * The block is saved with the target, and so is its relation.
     */
    await page.reload();
    await expect(page.getByRole('button', { name: 'component', exact: true })).toBeVisible();

    /**
     * The `with-admin` packet has no edit view layout for this component, so its fields aren't
     * rendered: the values are read through the endpoints the edit view uses.
     */
    const documentId = new URL(page.url()).pathname.split('/').pop();
    const targetResponse = await page.request.get(
      `/content-manager/collection-types/${COMPLEX_UID}/${documentId}?locale=en`,
      { headers }
    );
    const [block] = (await targetResponse.json()).data.dynamic_zone;
    expect(block).toMatchObject({
      __component: 'component-category.component',
      shorttext: BLOCK_TEXT,
    });

    const relationResponse = await page.request.get(
      `/content-manager/relations/component-category.component/${block.id}/user?locale=en`,
      { headers }
    );
    expect((await relationResponse.json()).results).toEqual([
      expect.objectContaining({ id: user.id }),
    ]);
  });
});
