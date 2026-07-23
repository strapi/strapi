import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { getRegistryAuthHeader } from '../registry-token';

describe('getRegistryAuthHeader', () => {
  let cwd: string;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-token-'));
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
    process.env = { ...originalEnv };
  });

  const writeNpmrc = (contents: string) => {
    fs.writeFileSync(path.join(cwd, '.npmrc'), contents);
  };

  it('returns undefined when no .npmrc credentials exist', () => {
    // Point HOME at an empty dir so the machine's real ~/.npmrc is ignored.
    process.env.HOME = cwd;
    jest.spyOn(os, 'homedir').mockReturnValue(cwd);

    expect(getRegistryAuthHeader('https://registry.example.com', cwd)).toBeUndefined();
  });

  it('resolves a Bearer token from the matching nerf dart', () => {
    jest.spyOn(os, 'homedir').mockReturnValue(cwd);
    writeNpmrc('//registry.example.com/:_authToken=abc123\n');

    expect(getRegistryAuthHeader('https://registry.example.com', cwd)).toBe('Bearer abc123');
  });

  it('matches a registry served under a sub-path (longest match first)', () => {
    jest.spyOn(os, 'homedir').mockReturnValue(cwd);
    writeNpmrc(
      [
        '//registry.example.com/:_authToken=root-token',
        '//registry.example.com/artifactory/api/npm/repo/:_authToken=scoped-token',
      ].join('\n')
    );

    expect(
      getRegistryAuthHeader('https://registry.example.com/artifactory/api/npm/repo/', cwd)
    ).toBe('Bearer scoped-token');
  });

  it('expands env var references like npm does', () => {
    jest.spyOn(os, 'homedir').mockReturnValue(cwd);
    process.env.MY_NPM_TOKEN = 'from-env';
    // eslint-disable-next-line no-template-curly-in-string -- literal .npmrc content
    writeNpmrc('//registry.example.com/:_authToken=${MY_NPM_TOKEN}\n');

    expect(getRegistryAuthHeader('https://registry.example.com', cwd)).toBe('Bearer from-env');
  });

  it('supports legacy Basic _auth credentials', () => {
    jest.spyOn(os, 'homedir').mockReturnValue(cwd);
    writeNpmrc('//registry.example.com/:_auth=dXNlcjpwYXNz\n');

    expect(getRegistryAuthHeader('https://registry.example.com', cwd)).toBe('Basic dXNlcjpwYXNz');
  });
});
