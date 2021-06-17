'use strict';

// eslint-disable-next-line node/no-extraneous-require
const { combineReducers, createStore } = require('redux');

const reducers = {
  rbacProvider: jest.fn(() => ({ allPermissions: null, collectionTypesRelatedPermissions: {} })),
};

const store = createStore(combineReducers(reducers));

module.exports = {
  store,
  state: store.getState(),
};
