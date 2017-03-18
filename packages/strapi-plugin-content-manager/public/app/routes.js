// These are the pages you can go to.
// They are all wrapped in the App component, which should contain the navbar etc
// See http://blog.mxstbr.com/2016/01/react-apps-with-pages for more information
// about the code splitting business
import { getAsyncInjectors } from 'utils/asyncInjectors';
import appSagas from 'containers/App/sagas';

const loadModule = (cb) => (componentModule) => {
  cb(null, componentModule.default);
};

export default function createRoutes(store) {
  // Create reusable async injectors using getAsyncInjectors factory
  const { injectReducer, injectSagas } = getAsyncInjectors(store); // eslint-disable-line no-unused-vars

  // Inject app sagas
  injectSagas(appSagas);

  return [
    {
      path: '',
      name: 'home',
      getComponent(nextState, cb) {
        const reducer = require('containers/HomePage/reducer'); // eslint-disable-line global-require
        const component = require('containers/HomePage'); // eslint-disable-line global-require

        const renderRoute = loadModule(cb);

        injectReducer('home', reducer.default);
        renderRoute(component);
      },
    }, {
      path: '/list/:slug',
      name: 'list',
      getComponent(nextState, cb) {
        const reducer = require('containers/List/reducer'); // eslint-disable-line global-require
        const sagas = require('containers/List/sagas'); // eslint-disable-line global-require
        const component = require('containers/List'); // eslint-disable-line global-require

        const renderRoute = loadModule(cb);

        injectReducer('list', reducer.default);
        injectSagas(sagas.default);
        renderRoute(component);
      },
    }, {
      path: '/list/:slug/:id',
      name: 'list',
      getComponent(nextState, cb) {
        const reducer = require('containers/Single/reducer'); // eslint-disable-line global-require
        const sagas = require('containers/Single/sagas'); // eslint-disable-line global-require
        const component = require('containers/Single'); // eslint-disable-line global-require

        const renderRoute = loadModule(cb);

        injectReducer('single', reducer.default);
        injectSagas(sagas.default);
        renderRoute(component);
      },
    },
  ];
}
