'use strict';

const _ = require('lodash');

// Jest's `jest-environment-node` injects the *host* realm's `structuredClone`
// into the test sandbox, so its output objects/arrays carry the host realm's
// `Object.prototype`/`Array.prototype` instead of the sandbox's. `toStrictEqual`
// compares prototypes, so any assertion on a `structuredClone` result fails with
// "serializes to the same string" even though the values are identical.
// This setup file runs *inside* the sandbox realm, so re-binding it to core-js's
// pure (non-global-mutating) polyfill restores prototype parity: the polyfill is
// plain JS that allocates with the sandbox's own constructors, while faithfully
// implementing the structured-clone algorithm (throws DataCloneError on
// functions/symbols, handles Date/Map/Set/RegExp/TypedArrays/circular refs).
// Upstream bug: https://github.com/jestjs/jest/issues/2549 (open PR) — once jest
// stops injecting host-realm globals into the sandbox, this can be removed.
globalThis.structuredClone = require('core-js-pure/actual/structured-clone');

// TODO: remove this tmp fix and migrate tests
let strapiInstance;
Object.defineProperty(global, 'strapi', {
  get() {
    return strapiInstance;
  },
  set(value) {
    strapiInstance = value;

    strapiInstance.plugin = (name) => strapiInstance.plugins[name];
    _.mapValues(strapi.plugins, (acc) => {
      acc.controller = (name) => acc.controllers[name];
      acc.service = (name) => acc.services[name];
      acc.contentType = (name) => acc.contentTypes[name];
      acc.policy = (name) => acc.policies[name];
    });

    strapiInstance.api = (name) => strapiInstance.apis[name];
    _.mapValues(strapi.api, (acc) => {
      acc.controller = (name) => acc.controllers[name];
      acc.service = (name) => acc.services[name];
      acc.contentType = (name) => acc.contentTypes[name];
      acc.policy = (name) => acc.policies[name];
    });

    strapiInstance.service = (name = '') => {
      if (name.startsWith('admin::')) {
        return strapiInstance.admin.services[name.split('admin::')[1]];
      }
    };
  },
});
