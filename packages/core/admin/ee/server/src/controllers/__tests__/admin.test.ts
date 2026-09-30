import adminController from '../admin';

describe('EE admin controller', () => {
  const setup = ({
    isStrapiManagedAiEnabled = false,
    type = 'enterprise' as string | null,
    planPriceId = null as string | null,
    edition = 'Enterprise',
    seats = undefined as number | null | undefined,
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
        edition,
        seats,
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

    it.each(['Growth', 'Enterprise'])('reports the %s edition as projectType', async (edition) => {
      setup({ edition });

      const { data } = await adminController.getProjectType();

      expect(data.projectType).toBe(edition);
    });

    it.each([
      [undefined, false],
      [null, false],
      [5, true],
    ])('reports hasSeatLimit for seats %s as %s', async (seats, hasSeatLimit) => {
      setup({ seats });

      const { data } = await adminController.getProjectType();

      expect(data.hasSeatLimit).toBe(hasSeatLimit);
    });

    it('falls back to no seat limit when building the response throws', async () => {
      setup({ seats: 5 });
      jest.mocked(global.strapi.ai.admin.isStrapiManagedAiEnabled).mockImplementation(() => {
        throw new Error('AI service unavailable');
      });

      const { data } = await adminController.getProjectType();

      expect(data).toMatchObject({ isEE: false, projectType: 'Community', hasSeatLimit: false });
    });

    it('omits license fields that are null internally', async () => {
      setup({ type: null, planPriceId: null });

      const { data } = await adminController.getProjectType();

      expect(data.type).toBeUndefined();
      expect(data.planPriceId).toBeUndefined();
    });
  });
});
