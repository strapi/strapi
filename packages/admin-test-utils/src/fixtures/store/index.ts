import { combineReducers, configureStore } from '@reduxjs/toolkit';

const reducers = {
  admin_app: jest.fn(() => ({ permissions: {}, status: 'init' })),
  'content-manager_app': jest.fn(() => ({
    components: [],
    status: 'loading',
    models: [],
    collectionTypeLinks: [],
    singleTypeLinks: [],
  })),
  'content-manager_listView': jest.fn(() => ({
    data: [],
    isLoading: true,
    components: [],
    contentType: {},
    initialDisplayedHeaders: [],
    displayedHeaders: [],
    pagination: {
      total: 0,
    },
  })),
  'content-manager_rbacManager': jest.fn(() => ({ permissions: null })),
  'content-manager_editViewLayoutManager': jest.fn(() => ({ currentLayout: null })),
  'content-manager_editViewCrudReducer': jest.fn(() => ({
    componentsDataStructure: {},
    contentTypeDataStructure: {},
    isLoading: true,
    data: null,
    setModifiedDataOnly: false,
    status: 'resolved',
  })),
  rbacProvider: jest.fn(() => ({ allPermissions: null, collectionTypesRelatedPermissions: {} })),
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
