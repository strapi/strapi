import { createStore, applyMiddleware, compose } from 'redux';
import createReducer from './createReducer';

const configureStore = (appMiddlewares, appReducers) => {
  let composeEnhancers = compose;

  const middlewares = [];

  appMiddlewares.forEach((middleware) => {
    middlewares.push(middleware());
  });

  // If Redux Dev Tools  are installed, enable them
  if (
    process.env.NODE_ENV !== 'production' &&
    typeof window === 'object' &&
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
  ) {
    composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({});
  }

  return createStore(
    createReducer(appReducers),
    {},
    composeEnhancers(applyMiddleware(...middlewares))
  );
};

export default configureStore;
