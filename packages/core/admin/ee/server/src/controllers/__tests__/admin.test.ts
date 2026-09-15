import get from 'lodash/get';

import adminController from '../admin';

describe('EE admin controller', () => {
  const setup = ({
    config = {},
    licensedFeatures = [] as string[],
  }: {
    config?: Record<string, unknown>;
    licensedFeatures?: string[];
  } = {}) => {
    global.strapi = {
      EE: true,
      config: {
        get: jest.fn((key: string, defaultValue?: unknown) => get(config, key, defaultValue)),
      },
      ee: {
        isTrial: false,
        type: 'enterprise',
        planPriceId: undefined,
        features: {
          isEnabled: jest.fn((feature: string) => licensedFeatures.includes(feature)),
          list: jest.fn(() => licensedFeatures.map((name) => ({ name }))),
        },
      },
    } as any;
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProjectType', () => {
    it('reports AI as enabled when the license is active and the config is untouched', async () => {
      setup({ licensedFeatures: ['cms-ai'] });

      const { data } = await adminController.getProjectType();

      expect(data.ai).toEqual({ enabled: true });
    });

    /**
     * `admin: { ai: {} }` is a valid user config: it satisfies the `admin.ai`
     * branch, so a default read on that branch never fills `enabled` in.
     */
    it('reports a boolean when `admin.ai` is set without `enabled`', async () => {
      setup({ config: { admin: { ai: {} } }, licensedFeatures: ['cms-ai'] });

      const { data } = await adminController.getProjectType();

      expect(data.ai).toEqual({ enabled: true });
    });

    it('reports AI as disabled when the config opts out', async () => {
      setup({ config: { admin: { ai: { enabled: false } } }, licensedFeatures: ['cms-ai'] });

      const { data } = await adminController.getProjectType();

      expect(data.ai).toEqual({ enabled: false });
    });

    it('reports AI as disabled without the license, whatever the config says', async () => {
      setup({ config: { admin: { ai: { enabled: true } } } });

      const { data } = await adminController.getProjectType();

      expect(data.ai).toEqual({ enabled: false });
    });
  });
});
