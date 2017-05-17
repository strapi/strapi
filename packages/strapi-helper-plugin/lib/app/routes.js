// These are the pages you can go to.
// They are all wrapped in the App component, which should contain the navbar etc
// See http://blog.mxstbr.com/2016/01/react-apps-with-pages for more information
// about the code splitting business
import { map } from 'lodash';
import { getAsyncInjectors } from 'utils/asyncInjectors';
import appSagas from 'containers/App/sagas';
import routes from 'routes.json';

// Try to require a node module without throwing an error
const tryRequire = (path) => {
  try {
    return require('containers/' + path + '.js');
  } catch (err) {}
};

export default function createRoutes(store) {
  // Create reusable async injectors using getAsyncInjectors factory
  const { injectReducer, injectSagas } = getAsyncInjectors(store); // eslint-disable-line no-unused-vars

  // Inject app sagas
  injectSagas(appSagas);

  return map(routes, (route, key) => {
    return {
      path: key === '/' ? '' : key,
      name: route.name,
      getComponent(nextState, cb) {
        const reducer = tryRequire(`${route.container}/reducer`); // eslint-disable-line global-require
        const sagas = tryRequire(`${route.container}/sagas`); // eslint-disable-line global-require
        const component = tryRequire(`${route.container}/index`); // eslint-disable-line global-require

        process.nextTick(() => {
          if (reducer) injectReducer(route.name, reducer.default);
          if (sagas) injectSagas(sagas.default);
          cb(null, component.default);
        });
      },
    }
  });
}
