import { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { run } from '../basic';

describe('basic compiler', () => {
  let appDir: string;

  afterEach(async () => {
    if (appDir) {
      await rm(appDir, { recursive: true, force: true });
    }
  });

  test('emits JSON files matched by the ordinary application include pattern', async () => {
    appDir = await mkdtemp(join(tmpdir(), 'strapi-typescript-compiler-'));
    const contentTypeSchema = { kind: 'collectionType', info: { singularName: 'article' } };
    const groups = {
      version: 1,
      sections: {
        collectionTypes: { groups: [] },
        singleTypes: { groups: [] },
      },
    };

    await mkdir(join(appDir, 'src', 'api', 'article', 'content-types', 'article'), {
      recursive: true,
    });
    await mkdir(join(appDir, 'src', 'content-structure'), { recursive: true });
    await writeFile(join(appDir, 'src', 'index.ts'), "export const app = 'fixture';\n");
    await writeFile(
      join(appDir, 'src', 'api', 'article', 'content-types', 'article', 'schema.json'),
      JSON.stringify(contentTypeSchema)
    );
    await writeFile(
      join(appDir, 'src', 'content-structure', 'groups.json'),
      JSON.stringify(groups)
    );
    await writeFile(
      join(appDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'commonjs',
          moduleResolution: 'node',
          noCheck: true,
          noLib: true,
          outDir: 'dist',
          resolveJsonModule: true,
          rootDir: '.',
          target: 'ES2022',
        },
        include: ['src/**/*.ts', 'src/**/*.json'],
      })
    );

    run(join(appDir, 'tsconfig.json'), { ignoreDiagnostics: true });

    await expect(
      readFile(
        join(appDir, 'dist', 'src', 'api', 'article', 'content-types', 'article', 'schema.json'),
        'utf8'
      ).then(JSON.parse)
    ).resolves.toEqual(contentTypeSchema);
    await expect(
      readFile(join(appDir, 'dist', 'src', 'content-structure', 'groups.json'), 'utf8').then(
        JSON.parse
      )
    ).resolves.toEqual(groups);
  });
});
