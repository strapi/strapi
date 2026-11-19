import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

import {
  findStrictArtifactsOutsideProgram,
  formatStrictProgramWarning,
} from '../../../generators/strict/program';

const STRICT_FILENAMES = [
  'strict.d.ts',
  'plugins.d.ts',
  'services.ts',
  'controllers.ts',
  'policies.ts',
  'middlewares.ts',
];

// The tsconfig of the create-strapi-app TypeScript templates (`templates/vanilla/tsconfig.json`)
const TEMPLATE_TSCONFIG = {
  compilerOptions: {
    module: 'CommonJS',
    moduleResolution: 'Node',
    lib: ['ES2024'],
    target: 'ES2024',
    strict: true,
    skipLibCheck: true,
    outDir: 'dist',
    rootDir: '.',
  },
  include: ['./', './**/*.ts', './**/*.js', 'src/**/*.json'],
  exclude: [
    'node_modules/',
    'build/',
    'dist/',
    '.cache/',
    '.tmp/',
    '.strapi/',
    'src/admin/',
    '**/*.test.*',
    'src/plugins/**',
  ],
};

const outputFile = async (file: string, content: string) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
};

describe('findStrictArtifactsOutsideProgram', () => {
  const roots: string[] = [];

  /**
   * An application with the strict artifacts written under `types/generated` (or `generatedDir`),
   * a source file, and the given config files.
   */
  const createApp = async (
    configs: Record<string, string>,
    { generatedDir = path.join('types', 'generated') } = {}
  ) => {
    const appDir = await fs.mkdtemp(path.join(os.tmpdir(), 'strapi-strict-program-'));
    roots.push(appDir);

    await outputFile(path.join(appDir, 'src', 'index.ts'), 'export default {};\n');
    for (const filename of STRICT_FILENAMES) {
      await outputFile(path.join(appDir, generatedDir, filename), 'export {};\n');
    }
    for (const [file, content] of Object.entries(configs)) {
      await outputFile(path.join(appDir, file), content);
    }

    return {
      appDir,
      find: () =>
        findStrictArtifactsOutsideProgram({
          appDir,
          generatedDir: path.join(appDir, generatedDir),
          filenames: STRICT_FILENAMES,
        }),
    };
  };

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  test('reports none when the template tsconfig includes the generated files', async () => {
    const { find } = await createApp({ 'tsconfig.json': JSON.stringify(TEMPLATE_TSCONFIG) });

    expect(find()?.missing).toEqual([]);
  });

  test('reports every strict file when the tsconfig excludes types/generated', async () => {
    const { appDir, find } = await createApp({
      'tsconfig.json': JSON.stringify({
        ...TEMPLATE_TSCONFIG,
        exclude: [...TEMPLATE_TSCONFIG.exclude, 'types/generated/**'],
      }),
    });

    expect(find()).toEqual({
      configPath: path.join(appDir, 'tsconfig.json'),
      missing: STRICT_FILENAMES.map((filename) =>
        path.join(appDir, 'types', 'generated', filename)
      ),
    });
  });

  test('reports every strict file when the tsconfig include leaves types/ out', async () => {
    const { find } = await createApp({ 'tsconfig.json': JSON.stringify({ include: ['src'] }) });

    expect(find()?.missing).toHaveLength(STRICT_FILENAMES.length);
  });

  test('reports only the files the program leaves out', async () => {
    const { appDir, find } = await createApp({
      'tsconfig.json': JSON.stringify({ include: ['src', 'types/generated/strict.d.ts'] }),
    });

    expect(find()?.missing).toEqual(
      STRICT_FILENAMES.filter((filename) => filename !== 'strict.d.ts').map((filename) =>
        path.join(appDir, 'types', 'generated', filename)
      )
    );
  });

  test('reads the jsconfig when the application has no tsconfig', async () => {
    const { appDir, find } = await createApp({
      'jsconfig.json': JSON.stringify({ include: ['src'] }),
    });

    expect(find()?.configPath).toBe(path.join(appDir, 'jsconfig.json'));
    expect(find()?.missing).toHaveLength(STRICT_FILENAMES.length);
  });

  test('checks the files under a custom generated directory', async () => {
    const { find } = await createApp(
      { 'tsconfig.json': JSON.stringify({ include: ['src', 'custom-types'] }) },
      { generatedDir: path.join('custom-types', 'generated') }
    );

    expect(find()?.missing).toEqual([]);
  });

  test.each([
    ['there is no tsconfig nor jsconfig', {}],
    ['the tsconfig cannot be parsed', { 'tsconfig.json': '{ "include": ' }],
    [
      'the tsconfig has errors',
      {
        'tsconfig.json': JSON.stringify({
          compilerOptions: { module: 'unknown' },
          include: ['src'],
        }),
      },
    ],
    [
      'the tsconfig is solution-style',
      {
        'tsconfig.json': JSON.stringify({
          files: [],
          references: [{ path: './tsconfig.app.json' }],
        }),
        'tsconfig.app.json': JSON.stringify({ compilerOptions: { composite: true } }),
      },
    ],
  ])('returns undefined when %s', async (_, configs) => {
    const { find } = await createApp(configs);

    expect(find()).toBeUndefined();
  });
});

describe('formatStrictProgramWarning', () => {
  test('names the config and the files left out relative to the application', () => {
    const appDir = path.join(path.sep, 'app');

    const message = formatStrictProgramWarning(
      {
        configPath: path.join(appDir, 'tsconfig.json'),
        missing: [
          path.join(appDir, 'types', 'generated', 'strict.d.ts'),
          path.join(appDir, 'types', 'generated', 'services.ts'),
        ],
      },
      appDir
    );

    expect(message).toBe(
      'typescript.strictTypes is on, but tsconfig.json leaves out types/generated/strict.d.ts, ' +
        'types/generated/services.ts. The application type-checks without strict types, and reads ' +
        'the generated schemas as without strict types. Add these files to the program, for ' +
        'example by removing a types/generated exclusion.'
    );
  });
});
