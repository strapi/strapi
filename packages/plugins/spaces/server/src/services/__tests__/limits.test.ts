import { LICENSE_FEATURE } from '../../../../shared/constants';
import createLimitsService from '../limits';

interface Options {
  /** What the licence entitles the project to, if it says anything. */
  licensed?: number | null;
  /** What the project's own configuration asks for. */
  configured?: number | null;
  spaces?: number;
}

const makeStrapi = ({ licensed = null, configured = null, spaces = 0 }: Options = {}) => {
  const counted = jest.fn(async () => spaces);

  return {
    counted,
    strapi: {
      ee: {
        features: {
          get: (name: string) =>
            name === LICENSE_FEATURE && licensed !== null
              ? { name, options: { maximumSpaces: licensed } }
              : undefined,
        },
      },
      config: { get: (_key: string, fallback: unknown) => configured ?? fallback },
      service: () => ({ count: counted }),
    } as never,
  };
};

describe('how many spaces a project may have', () => {
  describe('the maximum', () => {
    it('is unlimited when neither the licence nor the config says otherwise', () => {
      const { strapi } = makeStrapi();

      expect(createLimitsService({ strapi }).getMaximum()).toBeNull();
    });

    it('is what the licence entitles the project to', () => {
      const { strapi } = makeStrapi({ licensed: 5 });

      expect(createLimitsService({ strapi }).getMaximum()).toBe(5);
    });

    it('is what the project configured, when the licence names no number', () => {
      const { strapi } = makeStrapi({ configured: 3 });

      expect(createLimitsService({ strapi }).getMaximum()).toBe(3);
    });

    it('lets configuration hold a project to fewer than it is entitled to', () => {
      const { strapi } = makeStrapi({ licensed: 10, configured: 3 });

      expect(createLimitsService({ strapi }).getMaximum()).toBe(3);
    });

    it('does not let configuration raise the licensed number', () => {
      // Otherwise the limit would be worth nothing.
      const { strapi } = makeStrapi({ licensed: 3, configured: 100 });

      expect(createLimitsService({ strapi }).getMaximum()).toBe(3);
    });
  });

  describe('creating one more', () => {
    it('is allowed below the maximum', async () => {
      const { strapi } = makeStrapi({ licensed: 5, spaces: 4 });

      await expect(createLimitsService({ strapi }).assertCanCreate()).resolves.toBeUndefined();
    });

    it('is refused at the maximum', async () => {
      const { strapi } = makeStrapi({ licensed: 5, spaces: 5 });

      await expect(createLimitsService({ strapi }).assertCanCreate()).rejects.toThrow(
        'This project is limited to 5 spaces.'
      );
    });

    it('is refused above it too, in case a licence was downgraded', async () => {
      const { strapi } = makeStrapi({ licensed: 2, spaces: 7 });

      await expect(createLimitsService({ strapi }).assertCanCreate()).rejects.toThrow(
        /limited to 2/
      );
    });

    it('says "space", singular, when only one is allowed', async () => {
      const { strapi } = makeStrapi({ licensed: 1, spaces: 1 });

      await expect(createLimitsService({ strapi }).assertCanCreate()).rejects.toThrow(
        'This project is limited to 1 space.'
      );
    });

    it('does not count the spaces when there is no limit to compare against', async () => {
      const { strapi, counted } = makeStrapi();

      await createLimitsService({ strapi }).assertCanCreate();

      expect(counted).not.toHaveBeenCalled();
    });
  });
});
