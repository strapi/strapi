import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import type { Core } from '@strapi/types';

import { getEnabledPlugins } from '../get-enabled-plugins';

const INTERNAL_PLUGINS = [
  'content-manager',
  'content-type-builder',
  'email',
  'upload',
  'i18n',
  'content-releases',
  'review-workflows',
];

const writeJson = (file: string, data: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data));
};

/**
 * An app laid out like an isolated install (pnpm's global virtual store): every package sees only
 * what it declares. The app declares `@strapi/strapi` and a plugin, `@strapi/strapi` declares the
 * internal plugins in its own node_modules, and none of them are resolvable from `@strapi/core`'s
 * location.
 */
const createApp = () => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-enabled-plugins-')));
  const strapiDir = path.join(root, 'node_modules', '@strapi', 'strapi');
  const pluginDir = path.join(root, 'node_modules', 'strapi-plugin-app-only');

  writeJson(path.join(root, 'package.json'), {
    name: 'app',
    dependencies: { '@strapi/strapi': '5.0.0', 'strapi-plugin-app-only': '1.0.0' },
  });
  writeJson(path.join(strapiDir, 'package.json'), { name: '@strapi/strapi', version: '5.0.0' });
  for (const name of INTERNAL_PLUGINS) {
    writeJson(path.join(strapiDir, 'node_modules', '@strapi', name, 'package.json'), {
      name: `@strapi/${name}`,
      version: '5.0.0',
      strapi: { kind: 'plugin', name },
    });
  }
  writeJson(path.join(pluginDir, 'package.json'), {
    name: 'strapi-plugin-app-only',
    version: '1.0.0',
    strapi: { kind: 'plugin', name: 'app-only' },
  });
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'config', 'plugins.js'),
    "module.exports = { 'app-only': { enabled: true } };"
  );

  return { root, strapiDir, pluginDir };
};

const createStrapiStub = (root: string) =>
  ({
    dirs: { app: { root }, dist: { root, config: path.join(root, 'config') } },
    config: {
      get: (key: string, defaultValue?: unknown) =>
        key === 'info.dependencies'
          ? { '@strapi/strapi': '5.0.0', 'strapi-plugin-app-only': '1.0.0' }
          : defaultValue,
    },
  }) as unknown as Core.Strapi;

describe('getEnabledPlugins', () => {
  let app: ReturnType<typeof createApp>;
  const previousStrapi = global.strapi;

  beforeEach(() => {
    app = createApp();
    global.strapi = createStrapiStub(app.root);
  });

  afterEach(() => {
    global.strapi = previousStrapi;
    fs.rmSync(app.root, { recursive: true, force: true });
  });

  test('resolves the internal plugins from the app’s @strapi/strapi, not from @strapi/core', async () => {
    const plugins = await getEnabledPlugins(global.strapi);

    for (const name of INTERNAL_PLUGINS) {
      expect(plugins[name]).toMatchObject({
        enabled: true,
        pathToPlugin: path.join(app.strapiDir, 'node_modules', '@strapi', name),
      });
    }
  });

  test('resolves installed plugins from the app root, not from @strapi/core', async () => {
    const plugins = await getEnabledPlugins(global.strapi);

    expect(plugins['app-only']).toMatchObject({
      enabled: true,
      pathToPlugin: app.pluginDir,
      info: { name: 'app-only', packageName: 'strapi-plugin-app-only' },
    });
  });
});
