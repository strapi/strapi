import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import ts from 'typescript';

const compile = (configPath: string) => {
  const config = ts.getParsedCommandLineOfConfigFile(
    configPath,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic(diagnostic) {
        throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      },
    }
  );

  if (!config) {
    throw new Error(`Could not parse ${configPath}`);
  }

  expect(config.errors).toEqual([]);

  const program = ts.createProgram({ rootNames: config.fileNames, options: config.options });
  expect(ts.getPreEmitDiagnostics(program)).toEqual([]);

  const result = program.emit();
  expect(result.emitSkipped).toBe(false);
  expect(result.diagnostics).toEqual([]);

  return config.options;
};

describe('server tsconfig build information', () => {
  let root: string;
  let baseConfigPath: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'strapi-server-config-'));
    baseConfigPath = path.join(root, 'node_modules/@strapi/typescript-utils/tsconfigs/server.json');
    mkdirSync(path.dirname(baseConfigPath), { recursive: true });
    copyFileSync(path.resolve(__dirname, '../../tsconfigs/server.json'), baseConfigPath);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const createProject = (name: string, compilerOptions: { tsBuildInfoFile?: string } = {}) => {
    const directory = path.join(root, name);
    const configPath = path.join(directory, 'tsconfig.json');
    mkdirSync(path.join(directory, 'src'), { recursive: true });
    writeFileSync(path.join(directory, 'src/index.ts'), `export const name = '${name}';\n`);
    writeFileSync(
      configPath,
      JSON.stringify({
        extends: baseConfigPath,
        compilerOptions: { rootDir: './src', outDir: './dist', types: [], ...compilerOptions },
        include: ['./src'],
      })
    );

    return { directory, configPath };
  };

  it('emits separate build information for projects sharing the installed config', () => {
    const first = createProject('first');
    const second = createProject('second');
    const firstBuildInfo = path.join(first.directory, '.tsbuildinfo');
    const secondBuildInfo = path.join(second.directory, '.tsbuildinfo');

    expect(compile(first.configPath).tsBuildInfoFile).toBe(firstBuildInfo);
    const firstContents = readFileSync(firstBuildInfo, 'utf8');

    expect(compile(second.configPath).tsBuildInfoFile).toBe(secondBuildInfo);
    expect(existsSync(secondBuildInfo)).toBe(true);
    expect(readFileSync(firstBuildInfo, 'utf8')).toBe(firstContents);
    expect(existsSync(path.join(path.dirname(baseConfigPath), '.tsbuildinfo'))).toBe(false);
    expect(existsSync(path.join(first.directory, 'dist/index.js'))).toBe(true);
    expect(existsSync(path.join(second.directory, 'dist/index.js'))).toBe(true);
  });

  it('preserves a consuming project override', () => {
    const project = createProject('custom', { tsBuildInfoFile: './cache/custom.tsbuildinfo' });
    const buildInfoPath = path.join(project.directory, 'cache/custom.tsbuildinfo');

    expect(compile(project.configPath).tsBuildInfoFile).toBe(buildInfoPath);
    expect(existsSync(buildInfoPath)).toBe(true);
    expect(existsSync(path.join(project.directory, '.tsbuildinfo'))).toBe(false);
    expect(existsSync(path.join(path.dirname(baseConfigPath), '.tsbuildinfo'))).toBe(false);
  });
});
