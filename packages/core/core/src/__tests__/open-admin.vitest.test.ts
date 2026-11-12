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

  it('does not reopen the admin on a restart after --open once an admin user exists', async () => {
    // The develop primary drops `--open` for workers it forks after a reload.
    await openAdmin(createFakeStrapi({ open: undefined }), true);

    expect(mockedOpenBrowser).not.toHaveBeenCalled();
  });

  it('reports a tab that could not be opened', async () => {
    mockedOpenBrowser.mockRejectedValueOnce(new Error('no browser'));
    const fake = createFakeStrapi({ open: true });

    await openAdmin(fake, true);

    expect(fake.telemetry.send).toHaveBeenCalledWith('didNotOpenTab');
  });
});
