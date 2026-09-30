import adminController from '../admin';

describe('Admin Controller', () => {
  describe('init', () => {
    beforeAll(() => {
      global.strapi = {
        ee: {
          features: {
            isEnabled() {
              return false;
            },
            list() {
              return [];
            },
          },
        },
        config: {
          get: jest.fn(() => 'foo'),
        },
        admin: {
          services: {
            user: {
              exists: jest.fn(() => true),
            },
            'project-settings': {
              getProjectSettings: jest.fn(() => ({ menuLogo: null, authLogo: null })),
            },
          },
        },
      } as any;
    });

    test('Returns the uuid and if the app has admins', async () => {
      const result = await adminController.init();

      expect(global.strapi.config.get).toHaveBeenCalledWith('uuid', false);
      expect(global.strapi.config.get).toHaveBeenCalledWith(
        'packageJsonStrapi.telemetryDisabled',
        null
      );
      expect(global.strapi.service('admin::user').exists).toHaveBeenCalled();
      expect(result.data).toBeDefined();
      expect(result.data).toStrictEqual({
        uuid: 'foo',
        hasAdmin: true,
        menuLogo: null,
        authLogo: null,
      });
    });
  });

  describe('telemetryProperties', () => {
    const setupStrapi = ({
      isDisabled = false,
      contentStructure,
    }: {
      isDisabled?: boolean;
      contentStructure?: { countGroups: jest.Mock };
    } = {}) => {
      global.strapi = {
        telemetry: { isDisabled },
        dirs: { app: { root: '/tmp/app' } },
        contentTypes: {},
        components: {},
        get: jest.fn((key: string) => (key === 'content-structure' ? contentStructure : undefined)),
      } as any;
    };

    test('reports numberOfContentTypeFolders from the content-structure service', async () => {
      const countGroups = jest.fn(async () => 4);
      setupStrapi({ contentStructure: { countGroups } });

      const ctx = {} as any;
      const result = await adminController.telemetryProperties(ctx);

      expect(countGroups).toHaveBeenCalled();
      expect(result?.data).toMatchObject({ numberOfContentTypeFolders: 4 });
    });

    test('falls back to 0 folders when the content-structure service is unavailable', async () => {
      setupStrapi({ contentStructure: undefined });

      const ctx = {} as any;
      const result = await adminController.telemetryProperties(ctx);

      expect(result?.data).toMatchObject({ numberOfContentTypeFolders: 0 });
    });

    test('falls back to 0 folders when countGroups throws', async () => {
      const countGroups = jest.fn(async () => {
        throw new Error('unreadable groups.json');
      });
      setupStrapi({ contentStructure: { countGroups } });

      const ctx = {} as any;
      const result = await adminController.telemetryProperties(ctx);

      expect(result?.data).toMatchObject({ numberOfContentTypeFolders: 0 });
    });

    test('returns 204 and no body when telemetry is disabled', async () => {
      setupStrapi({ isDisabled: true });

      const ctx = { status: 200 } as any;
      const result = await adminController.telemetryProperties(ctx);

      expect(ctx.status).toBe(204);
      expect(result).toBeUndefined();
    });
  });

  describe('information', () => {
    beforeAll(() => {
      global.strapi = {
        config: {
          get: jest.fn(
            (key: string, value) =>
              ({
                autoReload: undefined,
                'info.strapi': '1.0.0',
                'info.dependencies': {
                  dependency: '1.0.0',
                },
                uuid: 'testuuid',
                environment: 'development',
              })[key] || value
          ),
        },
        EE: true,
      } as any;
    });

    test('Returns application information', async () => {
      const result = await adminController.information();

      expect((global.strapi.config.get as jest.Mock).mock.calls).toEqual([
        ['environment'],
        ['autoReload', false],
        ['info.strapi', null],
        ['info.dependencies', {}],
        ['uuid', null],
      ]);
      expect(result.data).toBeDefined();
      expect(result.data).toMatchObject({
        currentEnvironment: 'development',
        autoReload: false,
        strapiVersion: '1.0.0',
        projectId: 'testuuid',
        dependencies: {
          dependency: '1.0.0',
        },
        nodeVersion: process.version,
        communityEdition: false,
      });
    });
  });

  describe('getProjectType', () => {
    const setup = ({
      isEE = true,
      isStrapiManagedAiEnabled = false,
      type = 'enterprise' as string | null,
      planPriceId = null as string | null,
      edition = 'Enterprise',
      features = [] as Array<Record<string, unknown>>,
    } = {}) => {
      global.strapi = {
        EE: isEE,
        config: {
          get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue),
        },
        ee: {
          isTrial: false,
          type,
          planPriceId,
          edition,
          features: {
            isEnabled: jest.fn(() => false),
            list: jest.fn(() => features),
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

    it('sends the feature names without their options', async () => {
      setup({
        features: [
          { name: 'sso', options: {} },
          { name: 'review-workflows', numberOfWorkflows: 3, options: { numberOfWorkflows: 3 } },
          { name: 'seat-limit', options: { seats: 5 } },
        ],
      });

      const { data } = await adminController.getProjectType();

      expect(data.features).toStrictEqual([
        { name: 'sso' },
        { name: 'review-workflows' },
        { name: 'seat-limit' },
      ]);
    });

    it('falls back to no features when building the response throws', async () => {
      setup({ features: [{ name: 'seat-limit', options: { seats: 5 } }] });
      jest.mocked(global.strapi.ai.admin.isStrapiManagedAiEnabled).mockImplementation(() => {
        throw new Error('AI service unavailable');
      });

      const { data } = await adminController.getProjectType();

      expect(data).toMatchObject({ isEE: false, projectType: 'Community', features: [] });
    });

    it('omits license fields that are null internally', async () => {
      setup({ type: null, planPriceId: null });

      const { data } = await adminController.getProjectType();

      expect(data.type).toBeUndefined();
      expect(data.planPriceId).toBeUndefined();
    });

    it('returns the Community project type without a license', async () => {
      setup({ isEE: false, type: null, edition: 'Community' });

      const result = await adminController.getProjectType();

      expect(JSON.parse(JSON.stringify(result))).toStrictEqual({
        data: {
          isEE: false,
          isTrial: false,
          features: [],
          flags: {},
          projectType: 'Community',
          ai: { enabled: false },
        },
      });
    });
  });

  describe('licenseLimitInformation', () => {
    const setup = ({
      seats,
      activeUserCount = 2,
      disabledUsers = null,
    }: {
      seats?: number;
      activeUserCount?: number;
      disabledUsers?: Array<{ id: number; isActive: boolean }> | null;
    } = {}) => {
      const count = jest.fn(() => Promise.resolve(activeUserCount));
      const features = seats === undefined ? [] : [{ name: 'seat-limit', options: { seats } }];

      global.strapi = {
        ee: {
          type: seats === undefined ? undefined : 'gold',
          isTrial: false,
          features: {
            list: jest.fn(() => features),
            get: jest.fn((name: string) => features.find((feature) => feature.name === name)),
          },
        },
        admin: {
          services: {
            user: { count },
            'seat-enforcement': {
              getDisabledUserList: jest.fn(() => Promise.resolve(disabledUsers)),
            },
          },
        },
      } as any;

      return { count };
    };

    test('reports no limit without a seat limit', async () => {
      const { count } = setup();

      const { data } = await adminController.licenseLimitInformation();

      expect(count).toHaveBeenCalledWith({ isActive: true });
      expect(JSON.parse(JSON.stringify(data))).toStrictEqual({
        currentActiveUserCount: 2,
        enforcementUserCount: 2,
        shouldNotify: false,
        shouldStopCreate: false,
        licenseLimitStatus: null,
        isHostedOnStrapiCloud: false,
        isTrial: false,
        features: [],
      });
    });

    test('counts the users disabled by the seat enforcement', async () => {
      setup({ seats: 3, disabledUsers: [{ id: 3, isActive: true }] });

      const { data } = await adminController.licenseLimitInformation();

      expect(data).toMatchObject({
        permittedSeats: 3,
        enforcementUserCount: 3,
        shouldNotify: true,
        shouldStopCreate: false,
        licenseLimitStatus: 'AT_LIMIT',
      });
    });

    test('reports over the limit and stops creation', async () => {
      setup({ seats: 2, disabledUsers: [{ id: 3, isActive: true }] });

      const { data } = await adminController.licenseLimitInformation();

      expect(data).toMatchObject({
        permittedSeats: 2,
        enforcementUserCount: 3,
        shouldNotify: true,
        shouldStopCreate: true,
        licenseLimitStatus: 'OVER_LIMIT',
      });
    });

    test('sends the features with their options', async () => {
      setup({ seats: 5 });

      const { data } = await adminController.licenseLimitInformation();

      expect(data.features).toStrictEqual([{ name: 'seat-limit', options: { seats: 5 } }]);
    });
  });

  describe('licenseTrialTimeLeft', () => {
    const setup = (isTrial: boolean) => {
      const getTrialEndDate = jest.fn(() => Promise.resolve({ trialEndsAt: '2026-10-07' }));
      global.strapi = { ee: { isTrial, getTrialEndDate } } as any;

      return { getTrialEndDate };
    };

    test('returns the trial end date of a trial license', async () => {
      const { getTrialEndDate } = setup(true);
      const ctx = { notFound: jest.fn() } as any;

      const result = await adminController.licenseTrialTimeLeft(ctx);

      expect(getTrialEndDate).toHaveBeenCalledWith({ strapi: global.strapi });
      expect(result).toEqual({ trialEndsAt: '2026-10-07' });
      expect(ctx.notFound).not.toHaveBeenCalled();
    });

    test('answers 404 without asking the license registry outside a trial', async () => {
      const { getTrialEndDate } = setup(false);
      const ctx = { notFound: jest.fn() } as any;

      await adminController.licenseTrialTimeLeft(ctx);

      expect(ctx.notFound).toHaveBeenCalled();
      expect(getTrialEndDate).not.toHaveBeenCalled();
    });
  });
});
