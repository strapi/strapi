import {
  configureStore,
  StoreEnhancer,
  Middleware,
  Reducer,
  combineReducers,
  MiddlewareAPI,
  isRejected,
} from '@reduxjs/toolkit';

import { reducer as appReducer, AppState, logout } from '../../reducer';
import { adminApi } from '../../services/api';

/**
 * @description Static reducers are ones we know, they live in the admin package.
 */
const staticReducers = {
  [adminApi.reducerPath]: adminApi.reducer,
  admin_app: appReducer,
} as const;

const injectReducerStoreEnhancer: (appReducers: Record<string, Reducer>) => StoreEnhancer =
  (appReducers) =>
  (next) =>
  (...args) => {
    const store = next(...args);

    const asyncReducers: Record<string, Reducer> = {};

    return {
      ...store,
      asyncReducers,
      injectReducer: (key: string, asyncReducer: Reducer) => {
        asyncReducers[key] = asyncReducer;
        store.replaceReducer(
          // @ts-expect-error we dynamically add reducers which makes the types uncomfortable.
          combineReducers({
            ...appReducers,
            ...asyncReducers,
          })
        );
      },
    };
  };

type PreloadState = Partial<{
  admin_app: AppState;
}>;

/**
 * @description This is the main store configuration function, injected Reducers use our legacy app.addReducer API,
 * which we're trying to phase out. App Middlewares could potentially be improved...?
 */
const configureStoreImpl = (
  preloadedState: PreloadState = {},
  appMiddlewares: Array<() => Middleware> = [],
  injectedReducers: Record<string, Reducer> = {}
) => {
  const coreReducers = { ...staticReducers, ...injectedReducers } as const;

  const defaultMiddlewareOptions = {} as any;

  // These are already disabled in 'production' env but we also need to disable it in test environments
  // However, we want to leave them on for development so any issues can still be caught
  if (process.env.NODE_ENV === 'test') {
    defaultMiddlewareOptions.serializableCheck = false;
    defaultMiddlewareOptions.immutableCheck = false;
  }

  const store = configureStore({
    preloadedState: {
      admin_app: preloadedState.admin_app,
    },
    reducer: coreReducers,
    devTools: process.env.NODE_ENV !== 'production',
    middleware: (getDefaultMiddleware) => [
      ...getDefaultMiddleware(defaultMiddlewareOptions),
      rtkQueryUnauthorizedMiddleware,
      adminApi.middleware,
      ...appMiddlewares.map((m) => m()),
    ],
    enhancers: [injectReducerStoreEnhancer(coreReducers)],
  });

  return store;
};

const rtkQueryUnauthorizedMiddleware: Middleware =
  ({ dispatch }: MiddlewareAPI) =>
  (next) =>
  (action) => {
    // isRejectedWithValue Or isRejected
    if (isRejected(action) && action.payload?.status === 401) {
      dispatch(logout());
      window.location.href = '/admin/auth/login';
      return;
    }

    return next(action);
  };

type Store = ReturnType<typeof configureStoreImpl> & {
  asyncReducers: Record<string, Reducer>;
  injectReducer: (key: string, asyncReducer: Reducer) => void;
};

type RootState = ReturnType<Store['getState']>;

type Dispatch = Store['dispatch'];

export { configureStoreImpl as configureStore };
export type { RootState, Dispatch, AppState, Store, PreloadState };
