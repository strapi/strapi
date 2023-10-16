import {
  configureStore,
  StoreEnhancer,
  Middleware,
  Reducer,
  combineReducers,
  createSelector,
  Selector,
} from '@reduxjs/toolkit';
import { useDispatch, useStore, TypedUseSelectorHook, useSelector } from 'react-redux';

// @ts-expect-error no types, yet.
import rbacProviderReducer from '../components/RBACProvider/reducer';
// @ts-expect-error no types, yet.
import rbacManagerReducer from '../content-manager/hooks/useSyncRbac/reducer';
// @ts-expect-error no types, yet.
import cmAppReducer from '../content-manager/pages/App/reducer';
// @ts-expect-error no types, yet.
import editViewLayoutManagerReducer from '../content-manager/pages/EditViewLayoutManager/reducer';
// @ts-expect-error no types, yet.
import listViewReducer from '../content-manager/pages/ListView/reducer';
// @ts-expect-error no types, yet.
import editViewCrudReducer from '../content-manager/sharedReducers/crudReducer/reducer';
// @ts-expect-error no types, yet.
import appReducer from '../pages/App/reducer';

const createReducer = (
  appReducers: Record<string, Reducer>,
  asyncReducers: Record<string, Reducer>
) => {
  return combineReducers({
    ...appReducers,
    ...asyncReducers,
  });
};

/**
 * @description Static reducers are ones we know, they live in the admin package.
 */
const staticReducers: Record<string, Reducer> = {
  admin_app: appReducer,
  rbacProvider: rbacProviderReducer,
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
        // @ts-expect-error we dynamically add reducers which makes the types uncomfortable.
        store.replaceReducer(createReducer(appReducers, asyncReducers));
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
  const coreReducers = { ...staticReducers, ...injectedReducers };

  const store = configureStore({
    reducer: createReducer(coreReducers, {}),
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
type AppDispatch = Store['dispatch'];

const useTypedDispatch: () => AppDispatch = useDispatch;
const useTypedStore = useStore as () => Store;
const useTypedSelector: TypedUseSelectorHook<RootState> = useSelector;

const createTypedSelector = <TResult>(selector: Selector<RootState, TResult>) =>
  createSelector((state: RootState) => state, selector);

export {
  useTypedDispatch,
  useTypedStore,
  useTypedSelector,
  configureStoreImpl as configureStore,
  createTypedSelector,
};
export type { RootState };
