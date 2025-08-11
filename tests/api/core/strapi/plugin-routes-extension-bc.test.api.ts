import path from 'path';
import fs from 'node:fs/promises';

import { createStrapiInstance } from 'api-tests/strapi';

const writeFileSafe = async (filePath, contents) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents);
};

describe('Plugin route extension backward compatibility', () => {
  let strapi;

  beforeAll(async () => {
    const appRoot = path.resolve(__dirname, '../../../../test-apps/api');

    const upExtPath = path.join(appRoot, 'src/extensions/users-permissions/strapi-server.js');
    const upExtSource = `module.exports = (plugin) => {
  if (plugin.routes && plugin.routes["content-api"] && plugin.routes["content-api"].routes) {
    plugin.routes["content-api"].routes = plugin.routes["content-api"].routes.map((route) => route);
  }
  return plugin;
};
`;

    const i18nExtPath = path.join(appRoot, 'src/extensions/i18n/strapi-server.js');
    const i18nExtSource = `module.exports = (plugin) => {
  if (plugin.routes && plugin.routes["content-api"] && plugin.routes["content-api"].routes) {
    plugin.routes["content-api"].routes = plugin.routes["content-api"].routes.map((route) => route);
  }
  return plugin;
};
`;

    await Promise.all([
      writeFileSafe(upExtPath, upExtSource),
      writeFileSafe(i18nExtPath, i18nExtSource),
    ]);

    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  test('server starts when plugins mutate content-api routes', async () => {
    expect(strapi.server).toBeDefined();
    expect(strapi.server.httpServer.listening).toBe(true);
  });
});
