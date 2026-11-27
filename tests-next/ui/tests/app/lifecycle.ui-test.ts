import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '../../fixtures';
import { UI_CONTENT_TYPES } from '../../setup/schema';

test('has the content types of setup/schema.ts only', ({ server }) => {
  // Ignore dotfiles such as the .gitkeep create-strapi-app leaves.
  expect(
    fs
      .readdirSync(path.join(server.app.dir, 'src', 'api'))
      .filter((name) => !name.startsWith('.'))
      .sort()
  ).toEqual(UI_CONTENT_TYPES.map((definition) => definition.singularName).sort());
});

test('serves the prebuilt admin panel', async ({ server }) => {
  // startServer already waited for /_health.
  const admin = await fetch(`${server.url}/admin`);
  expect(admin.status).toBe(200);
  expect(await admin.text()).toContain('<div id="strapi">');
});
