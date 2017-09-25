// These are the pages you can go to.
// They are all wrapped in the App component, which should contain the navbar etc
// See http://blog.mxstbr.com/2016/01/react-apps-with-pages for more information
// about the code splitting business
import { camelCase, map } from 'lodash';
import { getAsyncInjectors } from 'utils/asyncInjectors';
import routes from 'routes.json'; // eslint-disable-line

// Try to require a node module without throwing an error
const tryRequire = (path) => {
  try {
    return require(`containers/${path}.js`); // eslint-disable-line global-require
  } catch (err) {
    return null;
  }
};

export default function createRoutes(store) {
  // Create reusable async injectors using getAsyncInjectors factory
  const { injectReducer, injectSagas } = getAsyncInjectors(store); // eslint-disable-line no-unused-vars

  // Inject app sagas
  const appSagas = tryRequire('App/sagas');
  if (appSagas) injectSagas(appSagas.default);

  return map(routes, (route, key) => ({
    path: key === '/' ? '' : key,
    name: route.name,
    getComponent(nextState, cb) {
      const reducer = tryRequire(`${route.container}/reducer`); // eslint-disable-line global-require
      const sagas = tryRequire(`${route.container}/sagas`); // eslint-disable-line global-require
      const component = tryRequire(`${route.container}/index`); // eslint-disable-line global-require

      process.nextTick(() => {
        if (reducer) injectReducer(camelCase(route.container), reducer.default);
        if (sagas) injectSagas(sagas.default);
        cb(null, component.default);
      });
    },
  }));
}
