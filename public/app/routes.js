// These are the pages you can go to.
// They are all wrapped in the App component, which should contain the navbar etc
// See http://blog.mxstbr.com/2016/01/react-apps-with-pages for more information
// about the code splitting business
import { getAsyncInjectors } from 'utils/asyncInjectors';

const loadModule = (cb) => (componentModule) => {
  cb(null, componentModule.default);
};

const errorLoading = (err) => {
  console.error('Dynamic page loading failed', err); // eslint-disable-line no-console
};

export default function createRoutes(store) {
  // Create reusable async injectors using getAsyncInjectors factory
  const { injectReducer, injectSagas } = getAsyncInjectors(store); // eslint-disable-line no-unused-vars

  return [
    {
      path: '',
      name: 'home',
      getComponent(nextState, cb) {
        const reducer = require('containers/HomePage/reducer'); // eslint-disable-line global-require
        const sagas = require('containers/HomePage/sagas'); // eslint-disable-line global-require
        const component = require('containers/HomePage'); // eslint-disable-line global-require

        const renderRoute = loadModule(cb);

        injectReducer('home', reducer.default);
        injectSagas(sagas.default);
        renderRoute(component);
      },
    }, {
      path: '/languages',
      name: 'languages',
      getComponent(nextState, cb) {
        const component = require('containers/LanguagesPage'); // eslint-disable-line global-require

        const renderRoute = loadModule(cb);

        renderRoute(component);
      },
    }, {
      path: '/databases',
      name: 'databases',
      getComponent(nextState, cb) {
        const component = require('containers/DatabasesPage'); // eslint-disable-line global-require

        const renderRoute = loadModule(cb);

        renderRoute(component);
      },
    }, {
      path: '/security',
      name: 'security',
      getComponent(nextState, cb) {
        const component = require('containers/SecurityPage'); // eslint-disable-line global-require

        const renderRoute = loadModule(cb);

        renderRoute(component);
      },
    }, {
      path: '/server',
      name: 'server',
      getComponent(nextState, cb) {
        const component = require('containers/ServerPage'); // eslint-disable-line global-require

        const renderRoute = loadModule(cb);

        renderRoute(component);
      },
    }, {
      path: '/advanced',
      name: 'advanced',
      getComponent(nextState, cb) {
        const component = require('containers/AdvancedPage'); // eslint-disable-line global-require

        const renderRoute = loadModule(cb);

        renderRoute(component);
      },
    }, {
      path: '*',
      name: 'notfound',
      getComponent(nextState, cb) {
        System.import('containers/NotFoundPage')
          .then(loadModule(cb))
          .catch(errorLoading);
      },
    },
  ];
}
