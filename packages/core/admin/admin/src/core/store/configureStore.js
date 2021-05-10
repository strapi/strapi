import { createStore, applyMiddleware } from 'redux';
import createReducer from './createReducer';

const configureStore = app => {
  const middlewares = [];

  middlewares.forEach(middleware => {
    middlewares.push(middleware());
  });

  return createStore(createReducer(app.reducers), {}, applyMiddleware(...middlewares));
};

export default configureStore;
