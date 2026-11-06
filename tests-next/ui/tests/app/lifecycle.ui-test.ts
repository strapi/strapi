import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '../../fixtures/app';

test('generates an app without content types', ({ server }) => {
  // Ignore dotfiles such as the .gitkeep create-strapi-app leaves.
  expect(
    fs.readdirSync(path.join(server.app.dir, 'src', 'api')).filter((name) => !name.startsWith('.'))
  ).toEqual([]);
});

test('serves the prebuilt admin panel', async ({ server }) => {
  // startServer already waited for /_health.
  const admin = await fetch(`${server.url}/admin`);
  expect(admin.status).toBe(200);
  expect(await admin.text()).toContain('<div id="strapi">');
});
