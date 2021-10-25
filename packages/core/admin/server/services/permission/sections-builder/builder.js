'use strict';

/**
 * @typedef {import('@strapi/admin').AdminAction} AdminAction
 */

const createSection = require('./section');

/**
 * Create a new section builder with its own sections registry
 */
const createSectionBuilder = () => {
  const state = {
    sections: new Map(),
  };

  return {
    /**
     * Create & add a section to the builder's registry
     * @param {string} sectionName - The unique name of the section
     * @param {any} options - The options used to build a {@link Section}
     */
    createSection(sectionName, options) {
      const section = createSection(options);

      state.sections.set(sectionName, section);

      return this;
    },

    /**
     * Removes a section from the builder's registry using its unique name
     * @param {string} sectionName - The name of the section to delete
     */
    deleteSection(sectionName) {
      state.sections.remove(sectionName);

      return this;
    },

    /**
     * Register a handler function for a given section
     * @param {string} sectionName - The name of the section
     * @param {Function} handler - The handler to register
     */
    addHandler(sectionName, handler) {
      if (state.sections.has(sectionName)) {
        state.sections.get(sectionName).hooks.handlers.register(handler);
      }

      return this;
    },

    /**
     * Register a matcher function for a given section
     * @param {string} sectionName - The name of the section
     * @param {Function} matcher - The handler to register
     */
    addMatcher(sectionName, matcher) {
      if (state.sections.has(sectionName)) {
        state.sections.get(sectionName).hooks.matchers.register(matcher);
      }

      return this;
    },

    /**
     * Build a section tree based on the registered actions and the given actions
     * @param {AdminAction[]} actions - The actions used to build each section
     */
    async build(actions = []) {
      const sections = {};

      for (const [sectionName, section] of state.sections.entries()) {
        sections[sectionName] = await section.build(actions);
      }

      return sections;
    },
  };
};

module.exports = createSectionBuilder;
