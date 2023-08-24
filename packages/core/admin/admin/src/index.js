import { getFetchClient } from '@strapi/helper-plugin';
import { createRoot } from 'react-dom/client';

// This is the entry to allow developers to customize
// the admin panel https://docs.strapi.io/dev-docs/admin-panel-customization
import configuration from './app';
// This file is generated automatically
// eslint-disable-next-line import/extensions
import PLUGINS from './plugins';

window.strapi = {
  backendURL: process.env.STRAPI_ADMIN_BACKEND_URL,
  isEE: false,
  telemetryDisabled: process.env.STRAPI_TELEMETRY_DISABLED ?? false,
  features: {
    SSO: 'sso',
    AUDIT_LOGS: 'audit-logs',
    REVIEW_WORKFLOWS: 'review-workflows',
  },
  projectType: 'Community',
};

const run = async () => {
  const { get } = getFetchClient();

  try {
    const {
      data: {
        data: { isEE, features },
      },
    } = await get('/admin/project-type');

    window.strapi.isEE = isEE;
    window.strapi.features = {
      ...window.strapi.features,
      isEnabled: (featureName) => features.some((feature) => feature.name === featureName),
    };

    window.strapi.projectType = isEE ? 'Enterprise' : 'Community';
  } catch (error) {
    console.error(`
      Failed to fetch project-type: ${error}
    `);
  }

  // We need to make sure to fetch the project type before importing the StrapiApp
  // otherwise the strapi-babel-plugin does not work correctly
  const { StrapiApp } = await import(/* webpackChunkName: "StrapiApp" */ './StrapiApp');

  const app = new StrapiApp({
    // corePlugins must be passed in, because the file is auto-generated which makes it very
    // hard to test
    corePlugins: PLUGINS,
    configuration,
  });

  // Register pluginbs
  app.register();

  // Boostrap admin app & plugins
  app.bootstrap();

  // Load translations
  await app.loadTrads();

  // Render admin
  const root = createRoot(document.getElementById('app'));
  root.render(app.render());
};

run();
