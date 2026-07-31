import adminController from '../admin';

describe('EE Admin Controller', () => {
  describe('getProjectType', () => {
    const setup = (overrides: { flags?: object; disableLocalLoginForSSO?: boolean } = {}) => {
      const { flags = { nps: true }, disableLocalLoginForSSO = false } = overrides;

      global.strapi = {
        EE: true,
        ee: {
          isTrial: false,
          type: 'gold',
          features: {
            isEnabled: jest.fn(() => false),
            list: jest.fn(() => []),
          },
        },
        config: {
          get: jest.fn((key: string, defaultValue: unknown) => {
            if (key === 'admin.flags') {
              return flags;
            }
            if (key === 'admin.auth.disableLocalLoginForSSO') {
              return disableLocalLoginForSSO;
            }
            if (key === 'admin.ai') {
              return { enabled: false };
            }
            return defaultValue;
          }),
        },
      } as any;
    };

    test('Includes disableLocalLoginForSSO flag (default false) in the flags payload', async () => {
      setup();

      const result = await adminController.getProjectType();

      expect(global.strapi.config.get).toHaveBeenCalledWith(
        'admin.auth.disableLocalLoginForSSO',
        false
      );
      expect(result.data.flags).toStrictEqual({ nps: true, disableLocalLoginForSSO: false });
    });

    test('Reflects disableLocalLoginForSSO=true when configured', async () => {
      setup({ disableLocalLoginForSSO: true });

      const result = await adminController.getProjectType();

      expect(result.data.flags).toMatchObject({ disableLocalLoginForSSO: true });
    });

    test('Keeps the flag in the flags payload when the EE branch throws (fallback path)', async () => {
      setup({ flags: {}, disableLocalLoginForSSO: true });
      // Force the try branch to throw so we hit the catch fallback
      (global.strapi.ee.features.list as jest.Mock).mockImplementation(() => {
        throw new Error('boom');
      });

      const result = await adminController.getProjectType();

      expect(result.data).toStrictEqual({
        isEE: false,
        features: [],
        flags: { disableLocalLoginForSSO: true },
        ai: { enabled: false },
      });
    });
  });
});
