import { createStore, applyMiddleware } from 'redux';
import createReducer from './createReducer';

const configureStore = (appMiddlewares, appReducers) => {
  const middlewares = [];

  appMiddlewares.forEach(middleware => {
    middlewares.push(middleware());
  });

  return createStore(createReducer(appReducers), {}, applyMiddleware(...middlewares));
};

export default configureStore;
