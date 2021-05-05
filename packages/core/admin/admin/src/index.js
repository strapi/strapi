import ReactDOM from 'react-dom';
import StrapiApp from './StrapiApp';

const app = StrapiApp({});

const MOUNT_NODE = document.getElementById('app');

const run = async () => {
  await app.initialize();
  await app.boot();

  ReactDOM.render(app.render(), MOUNT_NODE);
};

run();
