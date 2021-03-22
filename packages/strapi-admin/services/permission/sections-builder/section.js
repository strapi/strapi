'use strict';

const { eq } = require('lodash/fp');
const { hooks } = require('strapi-utils');

const emptyObjectFactory = () => ({});

const createSection = ({
  initialStateFactory = emptyObjectFactory,
  handlers = [],
  matchers = [],
} = {}) => {
  const state = {
    hooks: {
      handlers: hooks.createAsyncSeriesHook(),
      matchers: hooks.createAsyncParallelHook(),
    },
  };

  // Register initial hooks
  handlers.forEach(handler => state.hooks.handlers.register(handler));
  matchers.forEach(matcher => state.hooks.matchers.register(matcher));

  return {
    hooks: state.hooks,

    async appliesToAction(action) {
      const results = await state.hooks.matchers.call(action);

      return results.some(eq(true));
    },

    async build(actions = []) {
      const section = initialStateFactory();

      for (const action of actions) {
        const applies = await this.appliesToAction(action);

        if (applies) {
          await state.hooks.handlers.call({ action, section });
        }
      }

      return section;
    },
  };
};

module.exports = createSection;
