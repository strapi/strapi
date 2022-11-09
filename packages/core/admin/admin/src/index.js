import ReactDOM from 'react-dom';
import { Components, Fields, Middlewares, Reducers } from './core/apis';
import { axiosInstance } from './core/utils';
import appCustomisations from './app';
// eslint-disable-next-line import/extensions
import plugins from './plugins';
import appReducers from './reducers';

window.strapi = {
  backendURL: process.env.STRAPI_ADMIN_BACKEND_URL,
  isEE: false,
  telemetryDisabled: process.env.STRAPI_TELEMETRY_DISABLED ?? false,
  features: {
    SSO: 'sso',
  },
  projectType: 'Community',
};

const customConfig = appCustomisations;

const library = {
  components: Components(),
  fields: Fields(),
};
const middlewares = Middlewares();
const reducers = Reducers({ appReducers });

const MOUNT_NODE = document.getElementById('app');

const run = async () => {
  try {
    const {
      data: {
        data: { isEE, features },
      },
    } = await axiosInstance.get('/admin/project-type');

    window.strapi.isEE = isEE;
    window.strapi.features = {
      ...window.strapi.features,
      allFeatures: features,
      isEnabled: (f) => features.includes(f),
    };

    window.strapi.projectType = isEE ? 'Enterprise' : 'Community';
  } catch (err) {
    console.error(err);
  }

  // We need to make sure to fetch the project type before importing the StrapiApp
  // otherwise the strapi-babel-plugin does not work correctly
  const StrapiApp = await import(/* webpackChunkName: "admin-app" */ './StrapiApp');

  const app = StrapiApp.default({
    appPlugins: plugins,
    library,
    adminConfig: customConfig,
    bootstrap: customConfig,
    middlewares,
    reducers,
  });

  await app.bootstrapAdmin();
  await app.initialize();
  await app.bootstrap();

  await app.loadTrads();

  ReactDOM.render(app.render(), MOUNT_NODE);
};

run();
