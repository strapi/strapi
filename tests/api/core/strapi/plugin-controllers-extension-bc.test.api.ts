import path from 'path';
import fs from 'node:fs/promises';

import { createStrapiInstance } from 'api-tests/strapi';
import { createContentAPIRequest } from 'api-tests/request';

const appRoot = path.resolve(__dirname, '../../../../test-apps/api');
const extensionPath = path.join(appRoot, 'src/extensions/users-permissions/strapi-server.js');

// Read, wrap, replace and add users-permissions controller actions, as documented extensions do.
const pluginExtensionSource = `
    module.exports = (plugin) => {
      const stockMe = plugin.controllers.user.me;

      plugin.controllers.user.me = async (ctx) => {
        await stockMe(ctx);
        ctx.body = { ...ctx.body, extended: true };
      };

      plugin.controllers.user.find = async (ctx) => {
        ctx.body = { replaced: true };
      };

      plugin.controllers.user.ping = async (ctx) => {
        ctx.body = { pong: true };
      };

      plugin.routes['content-api'].routes.push(
        { method: 'GET', path: '/users-ping', handler: 'user.ping', config: { auth: false, prefix: '' } },
        { method: 'GET', path: '/users-find', handler: 'user.find', config: { auth: false, prefix: '' } }
      );

      return plugin;
    };
`;

const readFileIfExists = async (filePath: string) => {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return undefined;
  }
};

describe('Plugin controller extension backward compatibility', () => {
  let strapi;
  let rq;
  let previousExtensionSource: string | undefined;

  beforeAll(async () => {
    previousExtensionSource = await readFileIfExists(extensionPath);
    await fs.mkdir(path.dirname(extensionPath), { recursive: true });
    await fs.writeFile(extensionPath, pluginExtensionSource);

    strapi = await createStrapiInstance({ bypassAuth: false });
    rq = createContentAPIRequest({ strapi });
  });

  afterAll(async () => {
    // Restore the extension first so a failed boot cannot leak it into other API test files.
    if (previousExtensionSource === undefined) {
      await fs.rm(extensionPath, { force: true });
    } else {
      await fs.writeFile(extensionPath, previousExtensionSource);
    }

    if (strapi !== undefined) {
      await strapi.db.query('plugin::users-permissions.user').deleteMany();
      await strapi.destroy();
    }
  });

  test('serves an action added by an extension', async () => {
    const res = await rq({ method: 'GET', url: '/users-ping' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ pong: true });
  });

  test('serves an action replaced by an extension', async () => {
    const res = await rq({ method: 'GET', url: '/users-find' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ replaced: true });
  });

  test('serves an extension that wraps the stock action', async () => {
    const authenticatedRole = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'authenticated' } });
    const user = await strapi.service('plugin::users-permissions.user').add({
      username: 'extension-user',
      email: 'extension-user@strapi.io',
      password: 'Test1234',
      confirmed: true,
      provider: 'local',
      role: authenticatedRole.id,
    });
    const jwt = await strapi.service('plugin::users-permissions.jwt').issue({ id: user.id });
    const authenticatedRq = createContentAPIRequest({ strapi, auth: { token: jwt } });

    const res = await authenticatedRq({ method: 'GET', url: '/users/me' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ username: 'extension-user', extended: true });
  });
});
