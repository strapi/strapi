/* eslint-disable import/first */

import path from 'node:path';
import { vol, fs } from 'memfs';

jest.mock('fs', () => fs);
jest.mock('esbuild-register/dist/node', () => ({
  register: jest.fn(() => ({ unregister: jest.fn() })),
}));

import { transformJSON } from '../../../../src/modules/runner/json/transform';

const cwd = '/__tests__';
const codemodPath = path.join(
  __dirname,
  '..',
  'tsconfig-remove-deprecated-module-resolution.json.ts'
);
const rootTsconfigPath = path.join(cwd, 'tsconfig.json');
const adminTsconfigPath = path.join(cwd, 'src', 'admin', 'tsconfig.json');

const legacyTsconfig = (moduleResolution: string, module = 'CommonJS') =>
  [
    '{',
    '  "compilerOptions": {',
    `    "module": "${module}",`,
    `    "moduleResolution": "${moduleResolution}",`,
    '    "strict": true',
    '  },',
    '  "include": [',
    '    // Include root files',
    '    "./"',
    '  ]',
    '}',
    '',
  ].join('\n');

const migratedTsconfig = [
  '{',
  '  "compilerOptions": {',
  '    "module": "CommonJS",',
  '    "strict": true',
  '  },',
  '  "include": [',
  '    // Include root files',
  '    "./"',
  '  ]',
  '}',
  '',
].join('\n');

const adminTsconfig = [
  '{',
  '  "compilerOptions": {',
  '    "module": "ESNext",',
  '    "moduleResolution": "Node"',
  '  }',
  '}',
  '',
].join('\n');

const run = async (files: Record<string, string>) => {
  vol.fromJSON(files, cwd);

  const report = await transformJSON(codemodPath, Object.keys(files), { cwd, dry: false });
  const read = (filePath: string) => vol.readFileSync(filePath).toString();

  return { report, read };
};

describe('5.999.0 tsconfig-remove-deprecated-module-resolution', () => {
  beforeEach(() => {
    vol.reset();
  });

  test.each(['Node', 'node10', 'NODE'])(
    'Removes "moduleResolution": "%s" and keeps the comments',
    async (moduleResolution) => {
      const { report, read } = await run({ [rootTsconfigPath]: legacyTsconfig(moduleResolution) });

      expect(report.ok).toBe(1);
      expect(read(rootTsconfigPath)).toBe(migratedTsconfig);
    }
  );

  test('Running it twice leaves the migrated file unchanged', async () => {
    const { read } = await run({ [rootTsconfigPath]: legacyTsconfig('Node') });

    const second = await transformJSON(codemodPath, [rootTsconfigPath], { cwd, dry: false });

    expect(second.nochange).toBe(1);
    expect(read(rootTsconfigPath)).toBe(migratedTsconfig);
  });

  test.each(['Bundler', 'node16', 'NodeNext'])(
    'Leaves "moduleResolution": "%s" untouched',
    async (moduleResolution) => {
      const source = legacyTsconfig(moduleResolution);
      const { report, read } = await run({ [rootTsconfigPath]: source });

      expect(report.nochange).toBe(1);
      expect(read(rootTsconfigPath)).toBe(source);
    }
  );

  test('Leaves a tsconfig without moduleResolution untouched', async () => {
    const { report, read } = await run({ [rootTsconfigPath]: migratedTsconfig });

    expect(report.nochange).toBe(1);
    expect(read(rootTsconfigPath)).toBe(migratedTsconfig);
  });

  test('Leaves "moduleResolution": "Node" untouched when module is not CommonJS', async () => {
    const source = legacyTsconfig('Node', 'ESNext');
    const { report, read } = await run({ [rootTsconfigPath]: source });

    expect(report.nochange).toBe(1);
    expect(read(rootTsconfigPath)).toBe(source);
  });

  test('Leaves the admin tsconfig untouched', async () => {
    const { report, read } = await run({
      [rootTsconfigPath]: legacyTsconfig('Node'),
      [adminTsconfigPath]: adminTsconfig,
    });

    expect(report.ok).toBe(1);
    expect(report.nochange).toBe(1);
    expect(read(rootTsconfigPath)).toBe(migratedTsconfig);
    expect(read(adminTsconfigPath)).toBe(adminTsconfig);
  });
});
