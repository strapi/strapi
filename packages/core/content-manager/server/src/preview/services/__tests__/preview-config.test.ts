import { createPreviewConfigService } from '../preview-config';

const getConfig = (enabled: boolean, handler: () => void) => {
  return {
    enabled,
    config: {
      handler,
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
  });
});
