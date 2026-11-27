// no-code-e2e: scenario=tests-next/ui/scenarios/content-manager/create-product-with-price.md id=cm-create-product-with-price hash=8789463a3d57
// Generated from tests-next/ui/scenarios/content-manager/create-product-with-price.md. Do not edit by hand: change the scenario instead.
import { expect, test } from '../../../fixtures';
import { EditViewPage, ListViewPage } from '../../../pages';

const PRODUCT = 'api::product.product';

test(
  'refuses a product without a price, then saves it once the price is filled in',
  { tag: ['@extended'] },
  async ({ page }) => {
    const list = new ListViewPage(page);
    const edit = new EditViewPage(page);

    await list.goto(PRODUCT, 'Product');
    await list.createEntry();
    await edit.fillName('Chair');
    await edit.save();

    // The save is refused and the price field shows a validation error.
    await expect(edit.fieldError('This value is required.')).toBeVisible();

    await edit.fillPrice('49.90');
    await edit.save();

    // A success notification shows.
    await expect(edit.notification(/saved/i)).toBeVisible();

    await list.goto(PRODUCT, 'Product');

    // The "Chair" entry shows in the list of products.
    await expect(list.row('Chair')).toBeVisible();
  }
);
