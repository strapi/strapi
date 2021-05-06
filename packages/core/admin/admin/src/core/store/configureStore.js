import { createStore, applyMiddleware } from 'redux';
import createReducer from './createReducer';

const configureStore = app => {
  // TODO
  const middlewares = [];

  return createStore(createReducer(app.reducers), {}, applyMiddleware(...middlewares));
};

export default configureStore;
