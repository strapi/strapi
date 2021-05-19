import ReactDOM from 'react-dom';
import StrapiApp from './StrapiApp';
import { Components, Fields, Middlewares, Reducers } from './core/apis';
import plugins from './plugins';
import appReducers from './reducers';

const library = {
  components: Components(),
  fields: Fields(),
};
const middlewares = Middlewares();
const reducers = Reducers({ appReducers });
const app = StrapiApp({ appPlugins: plugins, library, middlewares, reducers });

const MOUNT_NODE = document.getElementById('app');

const run = async () => {
  await app.initialize();
  await app.boot();

  ReactDOM.render(app.render(), MOUNT_NODE);
};

run();
