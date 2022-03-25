'use strict';

// eslint-disable-next-line node/no-extraneous-require
const { combineReducers, createStore } = require('redux');

const reducers = {
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
    status: 'resolved',
  })),
  rbacProvider: jest.fn(() => ({ allPermissions: null, collectionTypesRelatedPermissions: {} })),
};

const store = createStore(combineReducers(reducers));

module.exports = {
  store,
  state: store.getState(),
};
