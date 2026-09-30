import type * as License from '../license';

jest.mock('../license', () => ({
  readLicense: jest.fn(),
  verifyLicense: jest.fn(),
  fetchLicense: jest.fn(),
  LicenseCheckError: class LicenseCheckError extends Error {},
  LICENSE_REGISTRY_URI: 'https://license.strapi.io',
}));

const LICENSE_DIR = '/app';

type LicenseInfo = ReturnType<typeof License.verifyLicense>;

/**
 * Runs `init` on a fresh copy of the module: its state and `initialized` flag are module-level.
 */
const initEE = ({
  readLicense = undefined,
  licenseInfo = { type: 'gold', isTrial: false, features: [] },
}: {
  readLicense?: string;
  /** An `Error` makes `verifyLicense` throw it. */
  licenseInfo?: Partial<LicenseInfo> | Error;
} = {}) => {
  let ee: (typeof import('../index'))['default'] | undefined;
  let license: jest.Mocked<typeof License> | undefined;

  jest.isolateModules(() => {
    license = jest.requireMock<jest.Mocked<typeof License>>('../license');
    license.readLicense.mockReturnValue(readLicense);
    license.verifyLicense.mockImplementation(() => {
      if (licenseInfo instanceof Error) {
        throw licenseInfo;
      }

      return licenseInfo as LicenseInfo;
    });

    ee = jest.requireActual<typeof import('../index')>('../index').default;
    ee.init(LICENSE_DIR);
  });

  return { ee: ee!, license: license! };
};

describe('ee', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.STRAPI_LICENSE;
    delete process.env.STRAPI_DISABLE_EE;

    global.strapi = { eventHub: { emit: jest.fn() } } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('edition', () => {
    it('is Community without a license', () => {
      expect(initEE().ee.edition).toBe('Community');
    });

    it('is Community when STRAPI_DISABLE_EE is true', () => {
      process.env.STRAPI_DISABLE_EE = 'true';

      const { ee } = initEE({
        readLicense: 'file-license',
        licenseInfo: { planPriceId: 'growth-monthly' },
      });

      expect(ee.edition).toBe('Community');
    });

    it('is Community when the license fails verification', () => {
      const { ee } = initEE({
        readLicense: 'file-license',
        licenseInfo: new Error('Invalid license.'),
      });

      expect(ee.edition).toBe('Community');
    });

    it.each(['growth-monthly', 'price_Growth_Yearly', 'GROWTH'])(
      'is Growth when the plan price id is %s',
      (planPriceId) => {
        const { ee } = initEE({ readLicense: 'file-license', licenseInfo: { planPriceId } });

        expect(ee.edition).toBe('Growth');
      }
    );

    it.each([undefined, 'enterprise-yearly', 'pro-monthly'])(
      'is Enterprise when the plan price id is %p',
      (planPriceId) => {
        const { ee } = initEE({ readLicense: 'file-license', licenseInfo: { planPriceId } });

        expect(ee.edition).toBe('Enterprise');
      }
    );
  });

  describe('providedLicense', () => {
    it('prefers STRAPI_LICENSE over license.txt', () => {
      process.env.STRAPI_LICENSE = 'env-license';

      const { ee, license } = initEE({ readLicense: 'file-license' });

      expect(ee.providedLicense).toBe('env-license');
      expect(license.readLicense).not.toHaveBeenCalled();
      expect(license.verifyLicense).toHaveBeenCalledWith('env-license');
    });

    it('reads license.txt when STRAPI_LICENSE is empty', () => {
      process.env.STRAPI_LICENSE = '';

      const { ee, license } = initEE({ readLicense: 'file-license' });

      expect(ee.providedLicense).toBe('file-license');
      expect(license.readLicense).toHaveBeenCalledWith(LICENSE_DIR);
    });

    it('is undefined when no license is found', () => {
      const { ee } = initEE();

      expect(ee.providedLicense).toBeUndefined();
      expect(ee.isEE).toBe(false);
    });

    it('is undefined when STRAPI_DISABLE_EE is true', () => {
      process.env.STRAPI_DISABLE_EE = 'true';
      process.env.STRAPI_LICENSE = 'env-license';

      const { ee, license } = initEE({ readLicense: 'file-license' });

      expect(ee.providedLicense).toBeUndefined();
      expect(ee.isEE).toBe(false);
      expect(license.readLicense).not.toHaveBeenCalled();
    });
  });
});
