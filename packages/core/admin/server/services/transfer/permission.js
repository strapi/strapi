'use strict';

const permissions = require('@strapi/permissions');
const { providerFactory } = require('@strapi/utils');

const DEFAULT_TRANSFER_ACTIONS = ['push'];

const createPermissionService = () => {
  const state = {
    engine: null,

    providers: {
      action: null,
      condition: null,
    },
  };

  const registerTransferActions = () => {
    if (!state.providers.action) {
      return;
    }

    DEFAULT_TRANSFER_ACTIONS.forEach((action) => {
      state.providers.action.register(action, { action });
    });
  };

  return {
    get engine() {
      return state.engine;
    },

    get providers() {
      return state.providers;
    },

    init() {
      state.providers.action = providerFactory();
      state.providers.condition = providerFactory();

      registerTransferActions();

      state.engine = permissions.engine.new({ providers: state.providers });
    },
  };
};

module.exports = createPermissionService();
