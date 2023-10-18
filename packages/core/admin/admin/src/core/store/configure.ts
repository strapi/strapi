import {
  configureStore,
  StoreEnhancer,
  Middleware,
  Reducer,
  combineReducers,
} from '@reduxjs/toolkit';

import { RBACReducer } from '../../components/RBACProvider';
// @ts-expect-error no types, yet.
import rbacManagerReducer from '../../content-manager/hooks/useSyncRbac/reducer';
// @ts-expect-error no types, yet.
import cmAppReducer from '../../content-manager/pages/App/reducer';
// @ts-expect-error no types, yet.
import editViewLayoutManagerReducer from '../../content-manager/pages/EditViewLayoutManager/reducer';
// @ts-expect-error no types, yet.
import listViewReducer from '../../content-manager/pages/ListView/reducer';
// @ts-expect-error no types, yet.
import editViewCrudReducer from '../../content-manager/sharedReducers/crudReducer/reducer';
// @ts-expect-error no types, yet.
import appReducer from '../../pages/App/reducer';

/**
 * @description Static reducers are ones we know, they live in the admin package.
 */
const staticReducers = {
  admin_app: appReducer,
  rbacProvider: RBACReducer,
  'content-manager_app': cmAppReducer,
  'content-manager_listView': listViewReducer,
  'content-manager_rbacManager': rbacManagerReducer,
  'content-manager_editViewLayoutManager': editViewLayoutManagerReducer,
  'content-manager_editViewCrudReducer': editViewCrudReducer,
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

/**
 * @description This is the main store configuration function, injected Reducers use our legacy app.addReducer API,
 * which we're trying to phase out. App Middlewares could potentially be improved...?
 */
const configureStoreImpl = (
  appMiddlewares: Array<() => Middleware> = [],
  injectedReducers: Record<string, Reducer> = {}
) => {
  const coreReducers = { ...staticReducers, ...injectedReducers } as const;

  const store = configureStore({
    reducer: coreReducers,
    devTools: process.env.NODE_ENV !== 'production',
    middleware: (getDefaultMiddleware) => [
      ...getDefaultMiddleware(),
      ...appMiddlewares.map((m) => m()),
    ],
    enhancers: [injectReducerStoreEnhancer(coreReducers)],
  });

  return store;
};

type Store = ReturnType<typeof configureStoreImpl> & {
  asyncReducers: Record<string, Reducer>;
  injectReducer: (key: string, asyncReducer: Reducer) => void;
};

type RootState = ReturnType<Store['getState']>;

export { configureStoreImpl as configureStore };
export type { RootState, Store };
