// no-code-e2e: scenario=tests-next/ui/scenarios/content-manager/create-and-publish-article.md id=cm-create-and-publish-article hash=0685c6695f16
// Generated from tests-next/ui/scenarios/content-manager/create-and-publish-article.md. Do not edit by hand: change the scenario instead.
import { expect, test } from '../../../fixtures';
import { EditViewPage, ListViewPage } from '../../../pages';

const ARTICLE = 'api::article.article';

test.use({ role: 'editor' });

test('creates an article and publishes it', { tag: ['@critical'] }, async ({ page, seed }) => {
  await seed({
    entries: [
      { uid: ARTICLE, data: { title: 'Existing article 1' }, status: 'published' },
      { uid: ARTICLE, data: { title: 'Existing article 2' }, status: 'published' },
      { uid: ARTICLE, data: { title: 'Existing article 3' }, status: 'published' },
    ],
  });
  const list = new ListViewPage(page);
  const edit = new EditViewPage(page);

  await list.goto(ARTICLE, 'Article');
  await list.createEntry();
  await edit.fillTitle('Hello world');
  await edit.publish();

  // A success notification shows after publishing.
  await expect(edit.notification(/published/i)).toBeVisible();

  await list.goto(ARTICLE, 'Article');

  // The list contains 4 articles.
  await expect(list.rows()).toHaveCount(4);

  // The "Hello world" entry shows with the "Published" status.
  await expect(list.row('Hello world').getByText('Published', { exact: true })).toBeVisible();
});
