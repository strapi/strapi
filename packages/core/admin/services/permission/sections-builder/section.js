'use strict';

const { eq } = require('lodash/fp');
const { hooks } = require('@strapi/utils');

/**
 * @typedef SectionOptions
 * @property {function():any} initialStateFactory - A factory function that returns the default shape of the section
 * @property {Array<Function>} handlers - An initial collection of handlers which will be registered in the handlers hook
 * @property {Array<Function>} matchers - An initial collection of matchers which will be registered in the matchers hook
 */

const emptyObjectFactory = () => ({});

/**
 * Upon call, creates a new section object
 * @param {SectionOptions} options
 */
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

    /**
     * Verifies if an action can be applied to the section by running the matchers hook.
     * If any of the registered matcher functions returns true, then the condition applies.
     * @param {Action} action
     * @return {Promise<boolean>}
     */
    async appliesToAction(action) {
      const results = await state.hooks.matchers.call(action);

      return results.some(eq(true));
    },

    /**
     * Init, build and returns a section object based on the given actions
     * @param {Array<Action>} actions - A list of actions used to populate the section
     * @return {Promise<any>}
     */
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
