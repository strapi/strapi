import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import Strapi from '../Strapi';
import { openBrowser } from '../utils/open-browser';

vi.mock('../utils/open-browser', () => ({
  openBrowser: vi.fn().mockResolvedValue(undefined),
}));

const mockedOpenBrowser = vi.mocked(openBrowser);

type FakeStrapiOptions = {
  open?: boolean;
  environment?: string;
  autoOpen?: boolean;
};

const createFakeStrapi = ({
  open,
  environment = 'development',
  autoOpen,
}: FakeStrapiOptions = {}) => {
  const values: Record<string, unknown> = { environment, 'admin.autoOpen': autoOpen };
  return {
    openOnStart: open,
    config: {
      get: vi.fn((key: string, defaultValue?: unknown) => values[key] ?? defaultValue),
    },
    telemetry: { send: vi.fn() },
  };
};

const openAdmin = (fake: ReturnType<typeof createFakeStrapi>, isInitialized: boolean) =>
  Strapi.prototype.openAdmin.call(fake as unknown as Strapi, { isInitialized });

describe('Strapi.openAdmin', () => {
  beforeEach(() => {
    mockedOpenBrowser.mockClear();
  });

  it('opens the admin on the first run without a flag', async () => {
    const fake = createFakeStrapi();

    await openAdmin(fake, false);

    expect(mockedOpenBrowser).toHaveBeenCalledTimes(1);
    expect(fake.telemetry.send).toHaveBeenCalledWith('didOpenTab');
  });

  it('does not open the admin without a flag once an admin user exists', async () => {
    await openAdmin(createFakeStrapi(), true);

    expect(mockedOpenBrowser).not.toHaveBeenCalled();
  });

  it('opens the admin with --open even when an admin user exists', async () => {
    await openAdmin(createFakeStrapi({ open: true }), true);

    expect(mockedOpenBrowser).toHaveBeenCalledTimes(1);
  });

  it('does not open the admin with --no-open on the first run', async () => {
    await openAdmin(createFakeStrapi({ open: false }), false);

    expect(mockedOpenBrowser).not.toHaveBeenCalled();
  });

  it('does not open the admin with --open outside development', async () => {
    await openAdmin(createFakeStrapi({ open: true, environment: 'production' }), false);

    expect(mockedOpenBrowser).not.toHaveBeenCalled();
  });

  it('opens the admin when the instance is created with open: true', async () => {
    const appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-open-admin-'));
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify({ name: 'app' }));

    // openAdmin() only opens in the development environment, and the config reads NODE_ENV.
    const nodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    try {
      const instance = new Strapi({ appDir, distDir: appDir, open: true });

      await instance.openAdmin({ isInitialized: true });

      expect(mockedOpenBrowser).toHaveBeenCalledTimes(1);
    } finally {
      process.env.NODE_ENV = nodeEnv;
      fs.rmSync(appDir, { recursive: true, force: true });
    }
  });

  it('reports a tab that could not be opened', async () => {
    mockedOpenBrowser.mockRejectedValueOnce(new Error('no browser'));
    const fake = createFakeStrapi({ open: true });

    await openAdmin(fake, true);

    expect(fake.telemetry.send).toHaveBeenCalledWith('didNotOpenTab');
  });
});
