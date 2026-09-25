import os from 'node:os';
import path from 'node:path';
import fse from 'fs-extra';

import { generate } from '../../generators';

// prettier is loaded through a dynamic import that jest cannot run; the formatting is not under test
jest.mock('../../generators/utils', () => ({
  ...jest.requireActual('../../generators/utils'),
  format: jest.fn(async (content: string) => content),
}));

describe('generate', () => {
  const roots: string[] = [];

  const createApp = async (generated: Record<string, string> = {}) => {
    const root = await fse.mkdtemp(path.join(os.tmpdir(), 'strapi-typegen-'));
    roots.push(root);

    for (const [file, content] of Object.entries(generated)) {
      await fse.outputFile(path.join(root, 'types', 'generated', file), content);
    }

    const strapi = {
      dirs: { app: { api: path.join(root, 'src', 'api') } },
      services: {},
      contentTypes: {},
      components: {},
    };

    return {
      root,
      strapi,
      generated: (file: string) => path.join(root, 'types', 'generated', file),
    };
  };

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => fse.remove(root)));
  });

  test('writes the plugins opt-in when the artifact is enabled', async () => {
    const { root, strapi, generated } = await createApp();

    await generate({ strapi, pwd: root, artifacts: { plugins: true }, logger: { silent: true } });

    expect(await fse.readFile(generated('plugins.d.ts'), 'utf8')).toContain(
      "import type {} from '@strapi/strapi/plugins';"
    );
  });

  test('removes previously generated strict artifacts when they are disabled', async () => {
    const { root, strapi, generated } = await createApp({
      'services.d.ts': '// stale',
      'plugins.d.ts': '// stale',
      'contentTypes.d.ts': '// keep',
    });

    await generate({
      strapi,
      pwd: root,
      artifacts: { services: false, plugins: false },
      logger: { silent: true },
    });

    expect(await fse.pathExists(generated('services.d.ts'))).toBe(false);
    expect(await fse.pathExists(generated('plugins.d.ts'))).toBe(false);
    expect(await fse.pathExists(generated('contentTypes.d.ts'))).toBe(true);
  });

  test('leaves artifacts that are neither enabled nor disabled untouched', async () => {
    const { root, strapi, generated } = await createApp({ 'services.d.ts': '// keep' });

    await generate({ strapi, pwd: root, artifacts: { plugins: true }, logger: { silent: true } });

    expect(await fse.readFile(generated('services.d.ts'), 'utf8')).toBe('// keep');
  });

  test('disabling an artifact that was never generated is a no-op', async () => {
    const { root, strapi } = await createApp();

    const reports = await generate({
      strapi,
      pwd: root,
      artifacts: { services: false },
      logger: { silent: true },
    });

    expect(reports).toEqual({});
    expect(await fse.pathExists(path.join(root, 'types', 'generated'))).toBe(false);
  });
});
