import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

// Type only: `create-strapi-app` points `types` at dist/src/index.d.ts, but its build emits
// dist/types.d.ts next to dist/index.d.ts.
import type { Scope } from 'create-strapi-app/dist/types';

import { testPluginConfigEntry } from '../test-plugin';
import { APPS_DIR } from './config';

export interface App {
  name: string;
  /** Absolute path of the generated app. */
  dir: string;
  /** SQLite file of the app, created by Strapi on its first boot. */
  dbFile: string;
}

export interface GenerateAppOptions {
  name: string;
  /** Delete an existing app with the same name first. Default: true. */
  overwrite?: boolean;
}

const strapiVersion = (): string =>
  JSON.parse(fs.readFileSync(require.resolve('@strapi/strapi/package.json'), 'utf8')).version;

/**
 * Generate an empty Strapi app (no content types, no data). Content types, plugins and config
 * come from the scaffolders; data from the seeders.
 *
 * The app has no `node_modules`: `@strapi/*` resolves from the repo root (see `APPS_DIR`).
 */
export const generateApp = async ({ name, overwrite = true }: GenerateAppOptions): Promise<App> => {
  const dir = path.join(APPS_DIR, name);
  const app: App = { name, dir, dbFile: path.join(dir, '.tmp', 'data.db') };

  if (fs.existsSync(dir)) {
    if (!overwrite) {
      return app;
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }

  const version = strapiVersion();
  const scope: Scope = {
    name,
    rootPath: dir,
    packageManager: 'yarn',
    database: {
      client: 'sqlite',
      connection: { filename: '.tmp/data.db' },
    },
    strapiVersion: version,
    // The versions only matter for the app's package.json: nothing is installed.
    dependencies: {
      '@strapi/strapi': version,
      '@strapi/plugin-users-permissions': version,
      react: '18.2.0',
      'react-dom': '18.2.0',
      'react-router-dom': '^6.0.0',
      'styled-components': '^6.0.0',
    },
    installDependencies: false,
    runApp: false,
    gitInit: false,
    useTypescript: false,
    useExample: false,
    isQuickstart: false,
    shouldCreateGrowthSsoTrial: false,
    invocation: 'ci',
    agentName: null,
  };
  await promisify(execFile)(
    process.execPath,
    [path.join(__dirname, 'generate-app.cjs'), JSON.stringify(scope)],
    {
      maxBuffer: 10 * 1024 * 1024,
    }
  );

  // Load the test plugin (only when STRAPI_TEST_PLUGIN=true, see test-plugin.ts).
  const pluginsFile = path.join(dir, 'config', 'plugins.js');
  const plugins = fs.readFileSync(pluginsFile, 'utf8');
  if (!plugins.includes('module.exports = () => ({')) {
    throw new Error(`Unexpected ${pluginsFile}: cannot add the test plugin to it.`);
  }
  fs.writeFileSync(
    pluginsFile,
    plugins.replace(
      'module.exports = () => ({',
      `module.exports = () => ({\n  ${testPluginConfigEntry()}`
    )
  );

  // create-strapi-app leaves an empty node_modules; without it Node walks up to the repo root.
  fs.rmSync(path.join(dir, 'node_modules'), { recursive: true, force: true });

  return app;
};
