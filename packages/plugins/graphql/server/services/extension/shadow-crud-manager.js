'use strict';

const getDefaultContentTypeConfig = () => ({
  enabled: true,

  mutations: true,
  queries: true,

  disabledActions: [],
  fields: new Map(),
});

const getDefaultFieldConfig = () => ({
  enabled: true,

  input: true,
  output: true,

  filters: true,
});

const ALL_ACTIONS = '*';

module.exports = () => {
  const configs = new Map();

  return (uid) => {
    if (!configs.has(uid)) {
      configs.set(uid, getDefaultContentTypeConfig());
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

        return configs
          .get(uid)
          .disabledActions.every((action) => !matchingActions.includes(action));
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
        actions.forEach((action) => this.disableAction(action));

        return this;
      },

      field(fieldName) {
        const { fields } = configs.get(uid);

        if (!fields.has(fieldName)) {
          fields.set(fieldName, getDefaultFieldConfig());
        }

        return {
          isEnabled() {
            return fields.get(fieldName).enabled;
          },

          hasInputEnabled() {
            return fields.get(fieldName).input;
          },

          hasOutputEnabled() {
            return fields.get(fieldName).output;
          },

          hasFiltersEnabeld() {
            return fields.get(fieldName).filters;
          },

          disable() {
            fields.set(fieldName, {
              enabled: false,

              output: false,
              input: false,

              filters: false,
            });

            return this;
          },

          disableOutput() {
            fields.get(fieldName).output = false;

            return this;
          },

          disableInput() {
            fields.get(fieldName).input = false;

            return this;
          },

          disableFilters() {
            fields.get(fieldName).filters = false;

            return this;
          },
        };
      },
    };
  };
};
