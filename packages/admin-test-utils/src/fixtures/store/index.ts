import { combineReducers, configureStore } from '@reduxjs/toolkit';

const reducers = {
  admin_app: jest.fn(() => ({ permissions: {}, status: 'init' })),
  'content-manager_rbacManager': jest.fn(() => ({ permissions: null })),
};

const store = configureStore({
  reducer: combineReducers(reducers),
  middleware: (getDefaultMiddleware: any) =>
    getDefaultMiddleware({
      // Disable timing checks for test env
      immutableCheck: false,
      serializableCheck: false,
    }),
});

export default {
  store,
  state: store.getState(),
};
