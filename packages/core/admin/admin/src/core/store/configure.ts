import {
  configureStore,
  Middleware,
  Reducer,
  isRejected,
  combineSlices,
  createDynamicMiddleware,
} from '@reduxjs/toolkit';

import { adminSlice, AppState, initialize, logout } from '../../reducer';
import { adminApi } from '../../services/api';

const isActionWithStatus = (action: unknown): action is { payload: { status: number } } => {
  return (
    typeof action === 'object' &&
    action !== null &&
    'payload' in action &&
    typeof action['payload'] === 'object' &&
    action['payload'] !== null &&
    'status' in action['payload']
  );
};

const rtkQueryUnauthorizedMiddleware: Middleware =
  ({ dispatch }) =>
  (next) =>
  (action) => {
    // isRejectedWithValue Or isRejected
    if (isRejected(action) && isActionWithStatus(action) && action.payload.status === 401) {
      dispatch(logout());
      window.location.href = '/admin/auth/login';
      return;
    }

    return next(action);
  };

const dynamicMiddleware = createDynamicMiddleware();
dynamicMiddleware.addMiddleware(rtkQueryUnauthorizedMiddleware);

// Util to combine new slices with the default admin ones without breaking the types
const combineWithAdminSlices = (...slices: Parameters<typeof combineSlices>): Reducer =>
  combineSlices(adminApi, adminSlice, ...slices);

const store = configureStore({
  reducer: combineWithAdminSlices(),
  devTools: process.env.NODE_ENV !== 'production',
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: process.env.NODE_ENV === 'development',
      immutableCheck: process.env.NODE_ENV === 'development',
    }).concat(dynamicMiddleware.middleware),
}) as Store;

/**
 * @description This is the main store configuration function, injected Reducers use our legacy app.addReducer API,
 * which we're trying to phase out. App Middlewares could potentially be improved...?
 */
const configureStoreImpl = (
  initialState: AppState,
  appMiddlewares: Array<() => Middleware> = [],
  injectedReducers: Record<string, Reducer> = {}
): Store => {
  // Inject middleware from plugins
  dynamicMiddleware.addMiddleware(...appMiddlewares.map((m) => m()));

  /**
   * Add a dictionary for plugin reducers.
   * Initialize it with the reducers from the app.addReducers API.
   */
  store.asyncReducers = injectedReducers;
  store.replaceReducer(combineWithAdminSlices(injectedReducers));

  // Create an inject reducer function that plugins can access whenever
  store.injectReducer = (key: string, asyncReducer: Reducer) => {
    store.asyncReducers[key] = asyncReducer;
    store.replaceReducer(combineWithAdminSlices(injectedReducers));
  };

  store.dispatch(initialize(initialState));

  return store;
};

type Store = Omit<ReturnType<typeof configureStore>, 'getState'> & {
  asyncReducers: Record<string, Reducer>;
  injectReducer: (key: string, asyncReducer: Reducer) => void;
  getState: () => {
    admin_app: AppState;
  };
};

type RootState = ReturnType<Store['getState']>;

type Dispatch = Store['dispatch'];

export { configureStoreImpl as configureStore, store };
export type { RootState, Dispatch, AppState, Store };
