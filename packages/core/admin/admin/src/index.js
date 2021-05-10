import ReactDOM from 'react-dom';
import StrapiApp from './StrapiApp';
import plugins from './plugins';

const app = StrapiApp({ appPlugins: plugins });

const MOUNT_NODE = document.getElementById('app');

const run = async () => {
  await app.initialize();
  await app.boot();

  ReactDOM.render(app.render(), MOUNT_NODE);
};

run();
