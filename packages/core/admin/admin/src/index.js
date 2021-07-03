import ReactDOM from 'react-dom';
import StrapiApp from './StrapiApp';
import { Components, Fields, Middlewares, Reducers } from './core/apis';
import appCustomisations from './admin.config';
import plugins from './plugins';
import appReducers from './reducers';

const appConfig = {
  locales: [],
};

const customConfig = appCustomisations.app(appConfig);

const library = {
  components: Components(),
  fields: Fields(),
};
const middlewares = Middlewares();
const reducers = Reducers({ appReducers });
const app = StrapiApp({
  appPlugins: plugins,
  library,
  locales: customConfig.locales,
  middlewares,
  reducers,
});

const MOUNT_NODE = document.getElementById('app');

const run = async () => {
  await app.loadAdminTrads();
  await app.initialize();
  await app.boot();
  await app.loadTrads();

  ReactDOM.render(app.render(), MOUNT_NODE);
};

run();
