import http from 'node:http';
import type { AddressInfo } from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { Package } from '../package';
import { Logger } from '../../logger';

// Reproduction for https://github.com/strapi/strapi/issues/26962
// The upgrade tool must send the npm-configured credentials when the registry
// requires authentication. `Package.refresh()` currently issues a bare
// `fetch()` with no Authorization header, so an authenticated registry returns
// 403 and the upgrade fails with "Request failed for <url>".

const TOKEN = 's3cr3t-repro-token';

const mockNpmPackage = {
  _id: '@test/test',
  name: '@test/test',
  versions: {
    '1.0.0': { name: '@test/test', version: '1.0.0' },
  },
};

const mockLogger = {
  debug: jest.fn(),
  warn: jest.fn(),
  isSilent: false,
  isDebug: false,
  setSilent: jest.fn(),
  setDebug: jest.fn(),
  warnings: 0,
  errors: 0,
  stdout: undefined,
  stderr: undefined,
  info: jest.fn(),
  error: jest.fn(),
  raw: jest.fn(),
} as unknown as Logger;

describe('Package.refresh() against an authenticated registry (#26962)', () => {
  let server: http.Server;
  let registryUrl: string;
  let cwd: string;
  const originalEnv = { ...process.env };

  beforeAll((done) => {
    // A registry that mirrors Verdaccio's `access: $authenticated`: reads require auth.
    server = http.createServer((req, res) => {
      if (req.headers.authorization === `Bearer ${TOKEN}`) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(mockNpmPackage));
      } else {
        res.writeHead(403);
        res.end('Forbidden');
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      registryUrl = `http://127.0.0.1:${port}`;

      // A project whose .npmrc holds a valid token for that registry, exactly
      // like a user who has authenticated with `npm login`.
      cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'upgrade-auth-'));
      fs.writeFileSync(
        path.join(cwd, '.npmrc'),
        `//127.0.0.1:${port}/:_authToken=${TOKEN}\nregistry=${registryUrl}\n`
      );

      done();
    });
  });

  afterAll((done) => {
    process.env = originalEnv;
    if (cwd) fs.rmSync(cwd, { recursive: true, force: true });
    server.close(done);
  });

  it('resolves the package version using the configured npm credentials', async () => {
    process.env.NPM_REGISTRY_URL = registryUrl;

    const pkg = new Package('@test/test', cwd, mockLogger);

    // Sanity check: the token itself is valid — an authenticated request works.
    const authed = await fetch(`${registryUrl}/@test/test`, {
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(authed.status).toBe(200);

    // The upgrade tool should succeed too, because credentials are configured.
    // BUG: refresh() sends no Authorization header, so this rejects with
    // "Request failed for <url>" (the registry answers 403).
    await expect(pkg.refresh()).resolves.toBeDefined();
    expect(pkg.isLoaded).toBe(true);
  });
});
