import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { resolveYarnVersion } from '../../create-strapi';

const dirs: string[] = [];
const previousPath = process.env.PATH;
const previousUserAgent = process.env.npm_config_user_agent;

afterEach(() => {
  process.env.PATH = previousPath;
  if (previousUserAgent === undefined) {
    delete process.env.npm_config_user_agent;
  } else {
    process.env.npm_config_user_agent = previousUserAgent;
  }

  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

const yarnBinary = (script: string) => {
  const binDir = mkdtempSync(path.join(tmpdir(), 'strapi-yarn-bin-'));
  dirs.push(binDir);
  const yarnPath = path.join(binDir, 'yarn');
  writeFileSync(yarnPath, script);
  chmodSync(yarnPath, 0o755);
  process.env.PATH = `${binDir}${path.delimiter}${previousPath ?? ''}`;
};

describe('resolveYarnVersion', () => {
  it('reads Yarn from the new app directory, not the launching user agent', async () => {
    const appDir = mkdtempSync(path.join(tmpdir(), 'strapi-yarn-app-'));
    dirs.push(appDir);
    writeFileSync(path.join(appDir, '.yarn-classic'), '');

    yarnBinary(`#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const classic = fs.existsSync(path.join(process.cwd(), '.yarn-classic'));
process.stdout.write(classic ? '1.22.22\\n' : '4.12.0\\n');
`);
    process.env.npm_config_user_agent = 'yarn/4.12.0 npm/? node/v24.0.0 darwin arm64';

    await expect(resolveYarnVersion('yarn', appDir)).resolves.toBe('1.22.22');
  });

  it('falls back to the user agent when the app directory has no Yarn binary', async () => {
    const appDir = mkdtempSync(path.join(tmpdir(), 'strapi-yarn-app-'));
    const emptyBin = mkdtempSync(path.join(tmpdir(), 'strapi-yarn-empty-'));
    dirs.push(appDir, emptyBin);
    process.env.PATH = emptyBin;
    process.env.npm_config_user_agent = 'yarn/4.9.0 npm/? node/v24.0.0 darwin arm64';

    await expect(resolveYarnVersion('yarn', appDir)).resolves.toBe('4.9.0');
  });

  it('returns null for npm and pnpm', async () => {
    await expect(resolveYarnVersion('npm', tmpdir())).resolves.toBeNull();
    await expect(resolveYarnVersion('pnpm')).resolves.toBeNull();
  });
});
