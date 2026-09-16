import fs from 'fs';
import path from 'path';

/**
 * An internal plugin's admin panel is not discovered — it is wired in by hand.
 *
 * `getEnabledPlugins` here builds its list from the app's own dependencies and
 * its `config/plugins`. An internal plugin is in neither: the app depends on
 * `@strapi/strapi`, not on the plugins `@strapi/strapi` pulls in. So the
 * bundler never sees one, and the only reason i18n reaches the browser is that
 * `src/admin.ts` imports and registers it explicitly.
 *
 * Miss that step and the plugin's server half works perfectly while its screens
 * are absent from every build — with nothing failing anywhere to say so. These
 * tests are the thing that says so.
 */
const repoRoot = path.resolve(__dirname, '../../../../../../..');

const readInternalPluginPackages = () => {
  const source = fs.readFileSync(
    path.join(repoRoot, 'packages/core/core/src/loaders/plugins/get-enabled-plugins.ts'),
    'utf8'
  );

  const list = source.slice(source.indexOf('INTERNAL_PLUGINS'));
  const names = [...list.slice(0, list.indexOf(']')).matchAll(/'(@strapi\/[^']+)'/g)].map(
    (match) => match[1]
  );

  expect(names.length).toBeGreaterThan(0);

  return names;
};

/** The internal plugins that ship an admin panel, and so must be registered. */
const withAdminPanel = () =>
  readInternalPluginPackages().filter((name) => {
    const shortName = name.replace('@strapi/', '');
    const candidates = [
      path.join(repoRoot, 'packages/plugins', shortName, 'package.json'),
      path.join(repoRoot, 'packages/core', shortName, 'package.json'),
    ];
    const manifest = candidates.find((candidate) => fs.existsSync(candidate));

    if (!manifest) {
      return false;
    }

    const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));

    return Boolean(pkg.exports?.['./strapi-admin']);
  });

const adminEntry = () =>
  fs.readFileSync(path.join(repoRoot, 'packages/core/strapi/src/admin.ts'), 'utf8');

const aliases = () =>
  fs.readFileSync(path.join(repoRoot, 'packages/core/strapi/src/node/core/aliases.ts'), 'utf8');

const moduleDeclarations = () =>
  fs.readFileSync(path.join(repoRoot, 'packages/core/strapi/src/types/index.d.ts'), 'utf8');

describe('an internal plugin that ships an admin panel', () => {
  const plugins = withAdminPanel();

  it('there is at least one, or this file is testing nothing', () => {
    expect(plugins.length).toBeGreaterThan(0);
  });

  it.each(plugins)('%s is imported by the admin entry point', (name) => {
    expect(adminEntry()).toContain(`from '${name}/strapi-admin'`);
  });

  it.each(plugins)('%s is passed to renderAdmin, not merely imported', (name) => {
    // Importing it without listing it in `plugins` bundles the code and
    // registers nothing, which looks even more like success.
    const imported = adminEntry().match(
      new RegExp(`import\\s+(\\w+)\\s+from\\s+'${name.replace('/', '\\/')}\\/strapi-admin'`)
    );

    expect(imported).not.toBeNull();

    const registered = adminEntry().slice(adminEntry().indexOf('plugins: {'));
    expect(registered).toContain(`${imported![1]},`);
  });

  it.each(plugins)('%s resolves to its source while developing the monorepo', (name) => {
    // Without the alias the dev server loads the built output, so changes to
    // the plugin's admin code do not show up until it is rebuilt.
    expect(aliases()).toContain(`'${name}/strapi-admin':`);
  });

  it.each(plugins)('%s has a module declaration, so the entry point typechecks', (name) => {
    expect(moduleDeclarations()).toContain(`declare module '${name}/strapi-admin';`);
  });
});
