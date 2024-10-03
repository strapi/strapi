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
  test('Is not enabled by default', async () => {
    const strapi = {
      config: {
        get: () => undefined,
      },
    } as any;

    expect(createPreviewConfigService({ strapi }).isEnabled()).toBe(false);
  });

  test('Is enabled when configuration is set', async () => {
    const strapi = {
      config: {
        get: () => getConfig(true, () => {}),
      },
    } as any;

    expect(createPreviewConfigService({ strapi }).isEnabled()).toBe(true);
  });

  describe('Validation', () => {
    test('Passes on valid configuration', async () => {
      const strapi = {
        config: {
          get: () => getConfig(true, () => {}),
        },
      } as any;

      createPreviewConfigService({ strapi }).validate();
    });

    test('Fails on missing handler', async () => {
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
