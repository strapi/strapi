import { expect, test, type Page } from '@playwright/test';

import { type Mode, signOut, signUp, STRAPI_URL, writeFromPage } from './helpers.ts';

/** Writes an article on the articles page and waits until it is listed. A new article is a draft. */
const createArticle = async (page: Page, mode: Mode, label = '') => {
  const title = `E2E article${label} (${mode}) ${Date.now()}`;

  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Body').fill('Written by the end-to-end test.');
  await page.getByRole('button', { name: /create article/i }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  return title;
};

/** The card of the article with this title, wherever the page lists it */
const cardOf = (page: Page, title: string) =>
  page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: title }) });

/** Publishes a draft from its card and waits until the badge says so. */
const publishDraft = async (page: Page, title: string) => {
  const card = cardOf(page, title);

  await expect(card.getByTestId('article-status')).toHaveText('Draft');
  await card.getByRole('button', { name: 'Publish' }).click();
  await expect(card.getByTestId('article-status')).toHaveText('Published');
};

for (const mode of ['cookie', 'bearer'] as const) {
  test(`a signed-in user creates an article and sees it listed (${mode})`, async ({ page }) => {
    await signUp(page, mode);
    await page.goto('/articles');

    const title = await createArticle(page, mode);

    // It is in Strapi, not only on the page: the drafts list is in the address, so a reload keeps it
    await page.reload();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
  });

  test(`a signed-out visitor sees the list but has no form (${mode})`, async ({ page }) => {
    // Something to list. The seed lets the Authenticated role create articles (as drafts) and
    // publish its own, and the Public role read the published ones, which is what this test shows.
    await signUp(page, mode);
    await page.goto('/articles');

    const title = await createArticle(page, mode);

    await publishDraft(page, title);
    await signOut(page);
    await page.goto('/articles');

    // The list is there once the session has been looked at, so the form's absence means something
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.getByLabel('Title')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Sign in' }).first()).toBeVisible();
  });

  test(`a signed-in user writes a draft, publishes it, and cannot edit another user's article (${mode})`, async ({
    page,
  }) => {
    // A writes a draft, and publishes it
    await signUp(page, mode);
    await page.goto('/articles');

    const title = await createArticle(page, mode);

    await expect(cardOf(page, title).getByTestId('article-status')).toHaveText('Draft');
    await publishDraft(page, title);

    // Their own article has the buttons
    await expect(cardOf(page, title).getByRole('button', { name: 'Edit' })).toBeVisible();

    // B, who signs up next, reads it and is offered nothing to do with it
    await signOut(page);
    await signUp(page, mode);
    await page.goto('/articles');

    const card = cardOf(page, title);

    await expect(card).toBeVisible();
    await expect(card.getByTestId('article-status')).toHaveText('Published');
    await expect(card.getByRole('button', { name: 'Edit' })).toHaveCount(0);
    await expect(card.getByRole('button', { name: 'Publish' })).toHaveCount(0);

    // And Strapi refuses it without the page: the article is A's, so for B it is not there to update
    const listed = await page.request.get(`${STRAPI_URL}/api/articles`, {
      params: { 'filters[title][$eq]': title },
    });
    const [article] = (await listed.json()).data as Array<{ documentId: string }>;

    expect(article).toBeDefined();
    expect(
      await writeFromPage(page, mode, {
        method: 'PUT',
        path: `/api/articles/${article.documentId}`,
        body: { data: { title: 'taken over' } },
      })
    ).toBe(404);
  });

  test(`a signed-out visitor sees published articles only (${mode})`, async ({ page }) => {
    await signUp(page, mode);
    await page.goto('/articles');

    const published = await createArticle(page, mode, ' published');

    await publishDraft(page, published);

    // A second article stays a draft
    const draft = await createArticle(page, mode, ' draft');

    await expect(cardOf(page, draft).getByTestId('article-status')).toHaveText('Draft');

    await signOut(page);
    await page.goto('/articles');

    await expect(page.getByRole('heading', { name: published })).toBeVisible();
    await expect(page.getByRole('heading', { name: draft })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'My drafts' })).toHaveCount(0);
  });
}
