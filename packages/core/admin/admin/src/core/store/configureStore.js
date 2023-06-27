import { applyMiddleware, combineReducers, compose, createStore } from 'redux';

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

  const store = createStore(
    createReducer(appReducers, {}),
    {},
    composeEnhancers(applyMiddleware(...middlewares))
  );

  // Add a dictionary to keep track of the registered async reducers
  store.asyncReducers = {};

  // Create an inject reducer function
  // This function adds the async reducer, and creates a new combined reducer
  store.injectReducer = (key, asyncReducer) => {
    store.asyncReducers[key] = asyncReducer;
    store.replaceReducer(createReducer(appReducers, store.asyncReducers));
  };

  return store;
};

const createReducer = (appReducers, asyncReducers) => {
  return combineReducers({
    ...appReducers,
    ...asyncReducers,
  });
};

export default configureStore;
