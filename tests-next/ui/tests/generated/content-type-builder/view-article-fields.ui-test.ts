// no-code-e2e: scenario=tests-next/ui/scenarios/content-type-builder/view-article-fields.md id=ctb-view-article-fields hash=a45dfd9faf33
// Generated from tests-next/ui/scenarios/content-type-builder/view-article-fields.md. Do not edit by hand: change the scenario instead.
import { expect, test } from '../../../fixtures';
import { ContentTypeBuilderPage } from '../../../pages';

test('shows the fields of the Article content type', { tag: ['@extended'] }, async ({ page }) => {
  const builder = new ContentTypeBuilderPage(page);

  await builder.open();
  await builder.openType('Article');

  // "Article" shows in the list of collection types.
  await expect(builder.collectionTypeLink('Article')).toBeVisible();

  // The "title" field shows with its type.
  await expect(builder.field('title')).toContainText('title');
  await expect(builder.field('title')).toContainText('Text');

  // The "Save" button is disabled as long as nothing changed.
  await expect(builder.saveButton()).toBeDisabled();
});
