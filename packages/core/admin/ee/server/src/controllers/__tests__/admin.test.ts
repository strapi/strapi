import adminController from '../admin';

describe('EE admin controller', () => {
  const setup = ({
    isStrapiManagedAiEnabled = false,
    type = 'enterprise' as string | null,
    planPriceId = null as string | null,
  } = {}) => {
    global.strapi = {
      EE: true,
      config: {
        get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue),
      },
      ee: {
        isTrial: false,
        type,
        planPriceId,
        features: {
          isEnabled: jest.fn(() => false),
          list: jest.fn(() => []),
        },
      },
      ai: {
        admin: {
          isStrapiManagedAiEnabled: jest.fn(() => isStrapiManagedAiEnabled),
        },
      },
    } as any;
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProjectType', () => {
    it.each([true, false])(
      'reports AI enabled as %s from the AI admin service',
      async (enabled) => {
        setup({ isStrapiManagedAiEnabled: enabled });

        const { data } = await adminController.getProjectType();

        expect(data.ai).toEqual({ enabled });
      }
    );

    it('omits license fields that are null internally', async () => {
      setup({ type: null, planPriceId: null });

      const { data } = await adminController.getProjectType();

      expect(data.type).toBeUndefined();
      expect(data.planPriceId).toBeUndefined();
    });
  });
});
