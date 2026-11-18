import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import execa from 'execa';

import packageJson from '../../package.json';
import buildConfig from '../../tsconfig.build.json';

const workspaceDirectory = path.resolve(__dirname, '../..');

// Use the same root compiler as the package's build:types script.
const compile = (configPath: string) =>
  execa('yarn', ['run', '-T', 'tsc', '--project', configPath], { cwd: workspaceDirectory });

describe('published declaration entry', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'strapi-cli-types-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('points to declarations emitted with the package build layout', async () => {
    const packageDirectory = path.join(root, 'node_modules/create-strapi-app');
    mkdirSync(path.join(packageDirectory, 'src'), { recursive: true });
    writeFileSync(
      path.join(packageDirectory, 'src/index.ts'),
      'export function run(args: string[]): void {}\n'
    );
    writeFileSync(path.join(packageDirectory, 'package.json'), JSON.stringify(packageJson));

    const buildConfigPath = path.join(packageDirectory, 'tsconfig.json');
    writeFileSync(
      buildConfigPath,
      JSON.stringify({
        compilerOptions: {
          ...buildConfig.compilerOptions,
          declaration: true,
          emitDeclarationOnly: true,
          types: [],
        },
        include: buildConfig.include,
      })
    );
    await compile(buildConfigPath);

    const declarationPath = path.resolve(packageDirectory, packageJson.types);
    expect(existsSync(declarationPath)).toBe(true);
    expect(readFileSync(declarationPath, 'utf8')).toContain('export declare function run');

    writeFileSync(
      path.join(root, 'consumer.ts'),
      [
        "import { run } from 'create-strapi-app';",
        'run([]);',
        '// @ts-expect-error The published declaration must reject non-string arguments.',
        'run([123]);',
      ].join('\n')
    );
    const consumerConfigPath = path.join(root, 'tsconfig.json');
    writeFileSync(
      consumerConfigPath,
      JSON.stringify({
        compilerOptions: { noEmit: true, strict: true, types: [], moduleResolution: 'node' },
        include: ['consumer.ts'],
      })
    );
    await compile(consumerConfigPath);
  }, 30000);
});
