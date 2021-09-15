'use strict';

const getDefaultConfig = () => ({
  enabled: true,

  mutations: true,
  queries: true,

  disabledActions: [],
});

const ALL_ACTIONS = '*';

module.exports = () => {
  const configs = new Map();

  return uid => {
    if (!configs.has(uid)) {
      configs.set(uid, getDefaultConfig());
    }

    return {
      isEnabled() {
        return configs.get(uid).enabled;
      },

      isDisabled() {
        return !this.isEnabled();
      },

      areQueriesEnabled() {
        return configs.get(uid).queries;
      },

      areQueriesDisabled() {
        return !this.areQueriesEnabled();
      },

      areMutationsEnabled() {
        return configs.get(uid).mutations;
      },

      areMutationsDisabled() {
        return !this.areMutationsEnabled();
      },

      isActionEnabled(action) {
        const matchingActions = [action, ALL_ACTIONS];

        return configs.get(uid).disabledActions.every(action => !matchingActions.includes(action));
      },

      isActionDisabled(action) {
        return !this.isActionEnabled(action);
      },

      disable() {
        configs.get(uid).enabled = false;

        return this;
      },

      disableQueries() {
        configs.get(uid).queries = false;

        return this;
      },

      disableMutations() {
        configs.get(uid).mutations = false;

        return this;
      },

      disableAction(action) {
        const config = configs.get(uid);

        if (!config.disabledActions.includes(action)) {
          config.disabledActions.push(action);
        }

        return this;
      },

      disableActions(actions = []) {
        actions.forEach(action => this.disableAction(action));

        return this;
      },
    };
  };
};
