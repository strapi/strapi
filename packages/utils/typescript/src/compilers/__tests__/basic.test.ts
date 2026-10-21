import { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { run } from '../basic';
import { defaultIgnoreDeprecations } from '../../utils/ignore-deprecations';

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

  describe('pre-TS 6 app tsconfig (moduleResolution node10 + noEmitOnError)', () => {
    const writeApp = async (compilerOptions: Record<string, unknown> = {}) => {
      appDir = await mkdtemp(join(tmpdir(), 'strapi-typescript-compiler-'));

      await mkdir(join(appDir, 'src'), { recursive: true });
      await writeFile(join(appDir, 'src', 'index.ts'), "export const app = 'fixture';\n");
      await writeFile(
        join(appDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            module: 'CommonJS',
            moduleResolution: 'Node',
            lib: ['ES2020'],
            types: [],
            target: 'ES2019',
            skipLibCheck: true,
            noEmitOnError: true,
            outDir: 'dist',
            rootDir: '.',
            ...compilerOptions,
          },
          include: ['src/**/*.ts'],
        })
      );
    };

    test('compiles and emits without diagnostics being ignored', async () => {
      await writeApp();

      expect(() => run(join(appDir, 'tsconfig.json'))).not.toThrow();
      await expect(readFile(join(appDir, 'dist', 'src', 'index.js'), 'utf8')).resolves.toContain(
        'fixture'
      );
    });

    test('defaults ignoreDeprecations only on TS 6 when the user did not set it', () => {
      expect(defaultIgnoreDeprecations({ ignoreDeprecations: '5.0' }, '6.0')).toEqual({});
      expect(defaultIgnoreDeprecations({}, '6.0')).toEqual({ ignoreDeprecations: '6.0' });
      expect(defaultIgnoreDeprecations({}, '5.9')).toEqual({});
    });

    test('keeps a user-set ignoreDeprecations instead of the default', async () => {
      // '5.0' does not silence TS 6 deprecations: the node10 error must surface
      await writeApp({ ignoreDeprecations: '5.0' });
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

      try {
        expect(() => run(join(appDir, 'tsconfig.json'))).toThrow('TypeScript compilation failed');
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('TS5107'));
      } finally {
        errorSpy.mockRestore();
        infoSpy.mockRestore();
      }
    });
  });
});
