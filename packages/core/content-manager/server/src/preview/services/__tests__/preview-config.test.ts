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

  describe('Validation', () => {
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
