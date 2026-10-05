import fs from 'fs';
import os from 'os';
import path from 'path';

import type { ResolvedAdminConfig } from '../../types/config/admin';
import { loadConfiguration } from '..';

describe('ResolvedAdminConfig', () => {
  let appDir: string;

  beforeAll(() => {
    appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-resolved-admin-'));
    fs.writeFileSync(path.join(appDir, 'package.json'), '{}');
    fs.mkdirSync(path.join(appDir, 'config'));
  });

  afterAll(() => {
    fs.rmSync(appDir, { recursive: true, force: true });
  });

  it('defines every field the contract marks as required with an empty user config', () => {
    // The loader's return type only knows the root `admin` object: read it as a partial contract.
    const admin: Partial<ResolvedAdminConfig> = loadConfiguration({
      appDir,
      distDir: appDir,
    }).admin;

    expect(admin.serveAdminPanel).toBe(true);
    expect(admin.url).toBe('/admin');
    expect(admin.path).toBe('/admin');
    expect(typeof admin.absoluteUrl).toBe('string');
  });
});
