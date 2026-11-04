import { expect, test } from '../../fixtures/app';

test('starts the app and serves the admin panel', async ({ server }) => {
  const health = await fetch(`${server.url}/_health`);
  expect(health.status).toBe(204);

  const admin = await fetch(`${server.url}/admin`);
  expect(admin.status).toBe(200);
  expect(await admin.text()).toContain('<div id="strapi">');
});
