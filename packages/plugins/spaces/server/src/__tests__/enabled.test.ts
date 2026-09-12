import { ENABLE_ENV_VAR, LICENSE_FEATURE } from '../../../shared/constants';
import { isEnabled } from '../enabled';

const setStrapi = ({
  isEE = true,
  licensed = false,
}: { isEE?: boolean; licensed?: boolean } = {}) => {
  (global as { strapi?: unknown }).strapi = {
    ee: {
      isEE,
      features: { isEnabled: (name: string) => licensed && name === LICENSE_FEATURE },
    },
  };
};

describe('whether a project may use Spaces', () => {
  const originalStrapi = (global as { strapi?: unknown }).strapi;
  const originalEnv = process.env[ENABLE_ENV_VAR];

  afterEach(() => {
    // The repo's unit setup decorates whatever is assigned here, so it is only
    // safe to put back something that was there in the first place.
    if (originalStrapi) {
      (global as { strapi?: unknown }).strapi = originalStrapi;
    }

    if (originalEnv === undefined) {
      delete process.env[ENABLE_ENV_VAR];
    } else {
      process.env[ENABLE_ENV_VAR] = originalEnv;
    }
  });

  it('it may, when the licence says so', () => {
    setStrapi({ licensed: true });
    delete process.env[ENABLE_ENV_VAR];

    expect(isEnabled()).toBe(true);
  });

  it('it may not, on an Enterprise licence without the feature', () => {
    setStrapi();
    delete process.env[ENABLE_ENV_VAR];

    expect(isEnabled()).toBe(false);
  });

  it('an Enterprise project can turn it on ahead of the licence rollout', () => {
    // The licence feature ships separately from the code.
    setStrapi();
    process.env[ENABLE_ENV_VAR] = 'true';

    expect(isEnabled()).toBe(true);
  });

  it('the variable is read case-insensitively', () => {
    setStrapi();
    process.env[ENABLE_ENV_VAR] = 'TRUE';

    expect(isEnabled()).toBe(true);
  });

  it.each(['false', '1', 'yes', ''])('but not by any other value (%s)', (value) => {
    setStrapi();
    process.env[ENABLE_ENV_VAR] = value;

    expect(isEnabled()).toBe(false);
  });

  it('the variable does not let a Community project in', () => {
    // It is an Enterprise feature; the escape hatch is not a way around that.
    setStrapi({ isEE: false });
    process.env[ENABLE_ENV_VAR] = 'true';

    expect(isEnabled()).toBe(false);
  });

  it('nor does a licence feature claimed outside Enterprise', () => {
    setStrapi({ isEE: false, licensed: true });
    delete process.env[ENABLE_ENV_VAR];

    expect(isEnabled()).toBe(false);
  });
});
