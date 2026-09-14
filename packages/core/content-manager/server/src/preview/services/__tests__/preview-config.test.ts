import { createPreviewConfigService } from '../preview-config';

const getConfig = (enabled: boolean, handler: () => void, viewports?: object) => {
  return {
    enabled,
    config: {
      handler,
      ...(viewports ? { viewports } : {}),
    },
  };
};

describe('Preview Config', () => {
  test('Is not enabled by default', () => {
    const strapi = {
      config: {
        get: () => undefined,
      },
    } as any;

    expect(createPreviewConfigService({ strapi }).isEnabled()).toBe(false);
  });

  test('Is enabled when configuration is set', () => {
    const strapi = {
      config: {
        get: () => getConfig(true, () => {}),
      },
    } as any;

    expect(createPreviewConfigService({ strapi }).isEnabled()).toBe(true);
  });

  describe('isConfigured', () => {
    test('Is configured when preview is explicitly disabled', () => {
      const strapi = {
        config: {
          get: () => ({ enabled: false }),
        },
      } as any;

      expect(createPreviewConfigService({ strapi }).isConfigured()).toBe(true);
    });

    test('Is configured when handler is configured', () => {
      const strapi = {
        config: {
          get: () => getConfig(true, () => {}),
        },
      } as any;

      expect(createPreviewConfigService({ strapi }).isConfigured()).toBe(true);
    });

    test('Is not configured when preview is neither disabled nor configured', () => {
      const strapi = {
        config: {
          get: () => ({ enabled: true }),
        },
      } as any;

      expect(createPreviewConfigService({ strapi }).isConfigured()).toBe(false);
    });

    test('Is not configured when no config is provided', () => {
      const strapi = {
        config: {
          get: () => undefined,
        },
      } as any;

      expect(createPreviewConfigService({ strapi }).isConfigured()).toBe(false);
    });
  });

  describe('validate', () => {
    test('Passes on valid configuration', () => {
      const strapi = {
        config: {
          get: () => getConfig(true, () => {}),
        },
      } as any;

      createPreviewConfigService({ strapi }).validate();
    });

    test('Fails on missing handler', () => {
      const strapi = {
        config: {
          // @ts-expect-error - invalid handler
          get: () => getConfig(true, 3),
        },
      } as any;

      expect(() => createPreviewConfigService({ strapi }).validate()).toThrowError();
    });

    test('Passes with valid viewports', () => {
      const strapi = {
        config: {
          get: () =>
            getConfig(true, () => {}, {
              desktop: { width: 1440, height: 900 },
              tablet: { width: 768, height: 1024 },
              mobile: { width: 390, height: 844 },
            }),
        },
      } as any;

      createPreviewConfigService({ strapi }).validate();
    });

    test('Fails on non-numeric viewport width/height', () => {
      const strapi = {
        config: {
          get: () => getConfig(true, () => {}, { tablet: { width: '768', height: 1024 } }),
        },
      } as any;

      expect(() => createPreviewConfigService({ strapi }).validate()).toThrowError();
    });

    test('Fails on negative viewport width/height', () => {
      const strapi = {
        config: {
          get: () => getConfig(true, () => {}, { mobile: { width: 390, height: -1 } }),
        },
      } as any;

      expect(() => createPreviewConfigService({ strapi }).validate()).toThrowError();
    });
  });

  describe('getViewports', () => {
    test('Returns an empty object when preview is disabled', () => {
      const strapi = {
        config: {
          get: () => undefined,
        },
      } as any;

      expect(createPreviewConfigService({ strapi }).getViewports()).toEqual({});
    });

    test('Returns an empty object when no viewports are configured', () => {
      const strapi = {
        config: {
          get: () => getConfig(true, () => {}),
        },
      } as any;

      expect(createPreviewConfigService({ strapi }).getViewports()).toEqual({});
    });

    test('Returns the configured viewports', () => {
      const viewports = { tablet: { width: 768, height: 1024 } };
      const strapi = {
        config: {
          get: () => getConfig(true, () => {}, viewports),
        },
      } as any;

      expect(createPreviewConfigService({ strapi }).getViewports()).toEqual(viewports);
    });
  });
});
