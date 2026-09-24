import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as ts from 'typescript';

import { generate } from '../../generators';
import { generatePluginDefinitions } from '../../generators/plugins';
import { createLogger } from '../../generators/utils';

// Jest's CommonJS VM cannot load Prettier's ESM implementation. Keep resolution,
// declaration generation, persistence and the TypeScript compiler real.
jest.mock('../../generators/utils', () => ({
  ...jest.requireActual('../../generators/utils'),
  format: async (content: string) => content,
}));

type Plugin = {
  enabled: boolean;
  pathToPlugin: string;
  packageInfo: { name: string };
  info: { packageName: string };
};

const modes = [
  { name: 'Node', module: 'CommonJS', moduleResolution: 'Node' },
  { name: 'Bundler', module: 'ESNext', moduleResolution: 'Bundler' },
  { name: 'NodeNext', module: 'NodeNext', moduleResolution: 'NodeNext' },
];

describe('Plugin declaration generation', () => {
  let appDir: string;
  let enabledPlugins: Record<string, Plugin>;
  let dependencies: Record<string, string>;
  let loadedPlugins: Record<string, object>;
  let temporaryDirectories: string[];

  const write = (filename: string, contents: string | object) => {
    const absolute = path.join(appDir, filename);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, typeof contents === 'string' ? contents : JSON.stringify(contents));
    return absolute;
  };

  const configure = ({ module, moduleResolution } = modes[0]) => {
    write('tsconfig.json', {
      compilerOptions: { module, moduleResolution, strict: true, noEmit: true, types: [] },
      include: ['src', 'types'],
    });
  };

  const install = (
    runtimeName: string,
    packageName: string,
    {
      alias = packageName,
      directory = `node_modules/${alias}`,
      legacy = true,
      serverTypes = true,
    } = {}
  ) => {
    const manifest = {
      name: packageName,
      exports: {
        './strapi-server': {
          ...(serverTypes ? { types: './dist/server/index.d.ts' } : {}),
          require: './dist/server/index.js',
          default: './dist/server/index.js',
        },
      },
      ...(legacy && serverTypes
        ? { typesVersions: { '*': { 'strapi-server': ['dist/server/index.d.ts'] } } }
        : {}),
    };
    write(`${directory}/package.json`, manifest);
    write(`${directory}/dist/server/index.js`, 'module.exports = {};');
    if (serverTypes) {
      write(
        `${directory}/dist/server/index.d.ts`,
        `export {}; declare global { namespace GeneratedPlugins { interface Contracts { '${runtimeName}': { enabled: true } } } }`
      );
    }
    const plugin = {
      enabled: true,
      pathToPlugin: path.join(appDir, directory),
      packageInfo: { name: packageName },
      info: { packageName },
    };
    enabledPlugins[runtimeName] = plugin;
    loadedPlugins[runtimeName] = {};
    dependencies[alias] = alias === packageName ? '1.0.0' : `npm:${packageName}@1.0.0`;
    return plugin;
  };

  const strapi = () => ({
    plugins: loadedPlugins,
    config: {
      get(key: string) {
        return key === 'enabledPlugins' ? enabledPlugins : dependencies;
      },
    },
  });

  const generatePlugins = () =>
    generatePluginDefinitions({
      strapi: strapi(),
      appDir,
      pwd: path.join(appDir, 'types/generated'),
      logger: createLogger({ silent: true }),
    });

  const expectTypecheck = (output: string, runtimeNames: string[]) => {
    write('types/generated/plugins.d.ts', output);
    write(
      'src/check.ts',
      runtimeNames
        .map(
          (name, index) =>
            `const check${index}: GeneratedPlugins.Contracts['${name}'] = { enabled: true };`
        )
        .join('\n')
    );
    const configPath = path.join(appDir, 'tsconfig.json');
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, appDir);
    const program = ts.createProgram(parsed.fileNames, parsed.options);
    const diagnostics = ts.getPreEmitDiagnostics(program);
    expect(
      diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    ).toEqual([]);
  };

  beforeEach(() => {
    appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-plugin-types-'));
    temporaryDirectories = [appDir];
    enabledPlugins = {};
    dependencies = {};
    loadedPlugins = {};
    write('package.json', { name: 'typegen-app', private: true });
    configure();
  });

  afterEach(() => {
    temporaryDirectories.forEach((directory) =>
      fs.rmSync(directory, { recursive: true, force: true })
    );
  });

  it.each(modes)(
    'loads server contracts through normal imports with $name resolution',
    async (mode) => {
      configure(mode);
      install('runtime-name', '@vendor/actual-package');

      const { output } = await generatePlugins();
      expect(output).toBe("import type {} from '@vendor/actual-package/strapi-server';\n");
      expect(output).not.toContain('strict-types');
      expectTypecheck(output, ['runtime-name']);
    }
  );

  it.each(modes)(
    'supports exports-only server declarations with $name resolution',
    async (mode) => {
      configure(mode);
      install('exported', '@vendor/exports-only', { legacy: false });

      const { output } = await generatePlugins();
      expect(output).toContain(
        mode.name === 'Node'
          ? '../../node_modules/@vendor/exports-only/dist/server/index.d.ts'
          : '@vendor/exports-only/strapi-server'
      );
      expectTypecheck(output, ['exported']);
    }
  );

  it('sorts and deduplicates imports independently of plugin declaration order', async () => {
    install('zebra', '@vendor/zebra');
    const alpha = install('alpha', '@vendor/alpha');
    enabledPlugins['another-alpha'] = alpha;
    loadedPlugins['another-alpha'] = {};

    const first = await generatePlugins();
    enabledPlugins = Object.fromEntries(Object.entries(enabledPlugins).reverse());
    const second = await generatePlugins();
    expect(second.output).toBe(first.output);
    expect(first.stats.plugins).toBe(2);
    expect(first.output).toBe(
      "import type {} from '@vendor/alpha/strapi-server';\nimport type {} from '@vendor/zebra/strapi-server';\n"
    );
  });

  it('uses the installed dependency alias instead of the package or runtime name', async () => {
    install('runtime-name', '@vendor/original', { alias: 'installed-alias' });

    const { output } = await generatePlugins();
    expect(output).toBe("import type {} from 'installed-alias/strapi-server';\n");
    expectTypecheck(output, ['runtime-name']);
  });

  it('honors resolver settings inherited from the app tsconfig', async () => {
    write('config/tsconfig.base.json', {
      compilerOptions: { module: 'ESNext', moduleResolution: 'Bundler', types: [] },
    });
    write('tsconfig.json', { extends: './config/tsconfig.base.json', include: ['src', 'types'] });
    install('inherited', '@vendor/inherited', { legacy: false });

    const { output } = await generatePlugins();
    expect(output).toBe("import type {} from '@vendor/inherited/strapi-server';\n");
    expectTypecheck(output, ['inherited']);
  });

  it.each(['commonjs', 'module'])(
    'loads ESM server declarations in a %s NodeNext app',
    async (type) => {
      configure(modes[2]);
      write('package.json', { name: 'typegen-app', type });
      const plugin = install('esm', '@vendor/esm', { legacy: false });
      const filename = path.join(plugin.pathToPlugin, 'package.json');
      const manifest = JSON.parse(fs.readFileSync(filename, 'utf8'));
      fs.writeFileSync(filename, JSON.stringify({ ...manifest, type: 'module' }));

      const { output } = await generatePlugins();
      expect(output).toBe("import type {} from '@vendor/esm/strapi-server';\n");
      expectTypecheck(output, ['esm']);
    }
  );

  it('keeps exports-only fallback imports inside symlinked node_modules', async () => {
    const plugin = install('linked', '@vendor/linked', { legacy: false });
    const external = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-plugin-install-'));
    temporaryDirectories.push(external);
    const installedPath = plugin.pathToPlugin;
    plugin.pathToPlugin = path.join(external, 'package');
    fs.renameSync(installedPath, plugin.pathToPlugin);
    fs.symlinkSync(plugin.pathToPlugin, installedPath, 'dir');

    const { output } = await generatePlugins();
    expect(output).toBe(
      "import type {} from '../../node_modules/@vendor/linked/dist/server/index.d.ts';\n"
    );
    expect(output).not.toContain(path.basename(external));
    expectTypecheck(output, ['linked']);
  });

  it('skips disabled, missing, admin-only and untyped server entries without importing package roots', async () => {
    install('disabled', 'disabled-plugin').enabled = false;
    const missing = install('missing', 'missing-plugin');
    fs.rmSync(missing.pathToPlugin, { recursive: true });
    install('admin-only', 'admin-only-plugin');
    delete loadedPlugins['admin-only'];
    install('untyped', 'untyped-plugin', { serverTypes: false });
    write('node_modules/untyped-plugin/package.json', {
      name: 'untyped-plugin',
      types: './admin.d.ts',
      main: './strapi-server.js',
    });
    write('node_modules/untyped-plugin/admin.d.ts', 'export type Admin = true;');
    write('node_modules/untyped-plugin/strapi-server.js', 'module.exports = {};');

    const { output, stats } = await generatePlugins();
    expect(output).toBe('export {};\n');
    expect(stats.plugins).toBe(0);
  });

  it.each([true, false])('supports configured local plugins with exports=%s', async (exports) => {
    const plugin = install('local', '@vendor/local', {
      directory: 'src/plugins/local',
      legacy: false,
    });
    dependencies = {};
    if (exports === false) {
      write('src/plugins/local/package.json', { name: '@vendor/local' });
      fs.copyFileSync(
        path.join(plugin.pathToPlugin, 'dist/server/index.d.ts'),
        path.join(plugin.pathToPlugin, 'strapi-server.d.ts')
      );
    }

    const { output } = await generatePlugins();
    expect(output).toContain(
      exports
        ? '../../src/plugins/local/dist/server/index.d.ts'
        : '../../src/plugins/local/strapi-server.d.ts'
    );
    expectTypecheck(output, ['local']);
  });

  it('regenerates an empty module after the last typed plugin is removed', async () => {
    const plugin = install('removed', '@vendor/removed');
    const config = {
      strapi: strapi(),
      pwd: appDir,
      artifacts: { plugins: true },
      logger: { silent: true },
    };
    await generate(config);
    const outputPath = path.join(appDir, 'types/generated/plugins.d.ts');
    expect(fs.readFileSync(outputPath, 'utf8')).toContain('@vendor/removed/strapi-server');

    fs.rmSync(plugin.pathToPlugin, { recursive: true });
    await generate(config);
    expect(fs.readFileSync(outputPath, 'utf8')).toBe('export {};\n');
  });

  it('reports invalid resolver configuration instead of generating with fallback options', async () => {
    write('tsconfig.json', { compilerOptions: { moduleResolution: 'invalid-mode' } });
    await expect(generatePlugins()).rejects.toThrow('moduleResolution');
  });
});
