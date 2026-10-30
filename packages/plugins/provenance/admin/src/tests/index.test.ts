import plugin from '../index';

import type { StrapiApp } from '@strapi/admin/strapi-admin';

const createApp = () => ({
  registerPlugin: jest.fn(),
  registerHook: jest.fn(),
  addSettingsLink: jest.fn(),
  getPlugin: jest.fn(() => ({
    apis: { addEditViewSidePanel: jest.fn(), addDocumentAction: jest.fn() },
    injectComponent: jest.fn(),
  })),
});

const setLicense = (features: string[]) => {
  window.strapi.features = {
    isEnabled: (name: string) => features.includes(name),
  } as unknown as typeof window.strapi.features;
};

describe('admin entry point', () => {
  const { features } = window.strapi;

  afterEach(() => {
    window.strapi.features = features;
  });

  it('adds nothing to the admin panel without the license feature', () => {
    setLicense(['review-workflows']);
    const app = createApp();

    plugin.register(app as unknown as StrapiApp);
    plugin.bootstrap(app as unknown as StrapiApp);

    expect(app.registerPlugin).toHaveBeenCalled();
    expect(app.addSettingsLink).not.toHaveBeenCalled();
    expect(app.registerHook).not.toHaveBeenCalled();
    expect(app.getPlugin).not.toHaveBeenCalled();
  });

  it('adds its panel, column and settings with it', () => {
    setLicense(['cms-ai-governance']);
    const app = createApp();

    plugin.register(app as unknown as StrapiApp);
    plugin.bootstrap(app as unknown as StrapiApp);

    expect(app.addSettingsLink).toHaveBeenCalled();
    expect(app.registerHook).toHaveBeenCalledTimes(2);
  });
});
