/* eslint-disable @typescript-eslint/no-var-requires, node/no-missing-require */
/**
 * Covers what `onlineUpdate` records in `ee_information` when the registry call fails.
 *
 * The admin panel has to tell two very different situations apart — "we couldn't reach
 * the registry" and "the registry refused this license" — and it can only do that from
 * what is persisted here. Inferring it from whether a cached license exists is wrong for
 * an instance that has never reached the registry at all.
 *
 * Same module-reset dance as license-retention.test.ts: the license state is a closure
 * singleton, so each test re-requires the module fresh.
 */

jest.mock('../license', () => ({
  ...jest.requireActual('../license'),
  readLicense: jest.fn(),
  verifyLicense: jest.fn(),
  fetchLicense: jest.fn(),
}));

type LicenseModuleMock = {
  readLicense: jest.Mock;
  verifyLicense: jest.Mock;
  fetchLicense: jest.Mock;
};

type EEModule = typeof import('../index').default;
type StoredInfo = { license?: string | null; error?: string; errorKind?: string };

const GOLD_LICENSE_INFO = {
  type: 'gold',
  isTrial: false,
  seats: 10,
  features: [{ name: 'sso' }],
  licenseKey: 'a-license-key',
};

/**
 * Query-builder double that records the `ee_information` row written back, so a test can
 * assert on what the admin endpoint will later read.
 */
const createRecordingDb = (storedRow: StoredInfo | null) => {
  const written: StoredInfo[] = [];

  const makeChain = (): any => {
    const chain: any = new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === 'then') return undefined;
          if (prop === 'insert' || prop === 'update') {
            return (payload: { value: string }) => {
              written.push(JSON.parse(payload.value));
              return chain;
            };
          }
          if (prop === 'execute') {
            return jest
              .fn()
              .mockResolvedValue(storedRow ? { value: JSON.stringify(storedRow) } : undefined);
          }
          return () => chain;
        },
      }
    );
    return chain;
  };

  return { queryBuilder: jest.fn().mockImplementation(makeChain), written };
};

const createMockStrapi = (storedRow: StoredInfo | null) => {
  const { queryBuilder, written } = createRecordingDb(storedRow);
  const strapi = {
    eventHub: { emit: jest.fn() },
    db: {
      transaction: jest.fn().mockResolvedValue({
        get: jest.fn().mockReturnValue({}),
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
      }),
      queryBuilder,
    },
    config: { get: jest.fn().mockReturnValue('project-uuid') },
    cron: { add: jest.fn() },
  };
  return { strapi: strapi as any, written };
};

describe('ee registry error kind', () => {
  let eeModule: EEModule;
  let license: LicenseModuleMock;

  const setup = (storedRow: StoredInfo | null) => {
    jest.resetModules();
    const { strapi, written } = createMockStrapi(storedRow);
    (global as any).strapi = strapi;

    license = jest.requireMock('../license') as LicenseModuleMock;
    license.readLicense.mockReset();
    license.verifyLicense.mockReset();
    license.fetchLicense.mockReset();

    delete process.env.STRAPI_LICENSE;
    delete process.env.STRAPI_DISABLE_EE;
    delete process.env.STRAPI_DISABLE_LICENSE_PING;

    eeModule = require('../index').default;
    return { strapi, written };
  };

  /**
   * The error has to be built AFTER `setup()`: `jest.resetModules()` gives the module under
   * test a fresh copy of `../license`, so a `LicenseCheckError` constructed from an earlier
   * registry is a different class and `instanceof` there would be false for the wrong reason.
   */
  const bootWithFetchError = async (
    makeError: (Ctor: new (message: string, shouldFallback?: boolean) => Error) => Error,
    storedRow: StoredInfo | null
  ) => {
    const { strapi, written } = setup(storedRow);
    const { LicenseCheckError } = jest.requireMock('../license') as {
      LicenseCheckError: new (message: string, shouldFallback?: boolean) => Error;
    };

    license.readLicense.mockReturnValue('raw-license');
    license.verifyLicense.mockReturnValue({ ...GOLD_LICENSE_INFO });
    license.fetchLicense.mockRejectedValue(makeError(LicenseCheckError));

    eeModule.init('/fake/license/dir');
    await eeModule.checkLicense({ strapi });

    return written[written.length - 1];
  };

  it('records `unreachable` when the registry could not be contacted at all', async () => {
    const stored = await bootWithFetchError(
      (Ctor) => new Ctor('Could not proceed to the online validation of your license.', true),
      null
    );

    expect(stored.errorKind).toBe('unreachable');
    expect(stored.license).toBeNull();
  });

  it('records `unreachable` when falling back to a cached license', async () => {
    const stored = await bootWithFetchError(
      (Ctor) => new Ctor('Could not proceed to the online validation of your license.', true),
      { license: 'cached-license', lastCheckAt: 0 } as StoredInfo
    );

    expect(stored.errorKind).toBe('unreachable');
    expect(stored.license).toBe('cached-license');
  });

  it('records `rejected` when the registry refuses the license', async () => {
    const stored = await bootWithFetchError((Ctor) => new Ctor('Invalid key.', false), null);

    expect(stored.errorKind).toBe('rejected');
    expect(stored.license).toBeNull();
  });

  it('records `rejected` for a non-LicenseCheckError failure', async () => {
    const stored = await bootWithFetchError(() => new Error('boom'), null);

    expect(stored.errorKind).toBe('rejected');
  });

  it('records no errorKind on a successful check', async () => {
    const { strapi, written } = setup(null);
    license.readLicense.mockReturnValue('raw-license');
    license.verifyLicense.mockReturnValue({ ...GOLD_LICENSE_INFO });
    license.fetchLicense.mockResolvedValue('fresh-license');

    eeModule.init('/fake/license/dir');
    await eeModule.checkLicense({ strapi });

    const stored = written[written.length - 1];
    expect(stored.errorKind).toBeUndefined();
    expect(stored.error).toBeUndefined();
    expect(stored.license).toBe('fresh-license');
  });
});
