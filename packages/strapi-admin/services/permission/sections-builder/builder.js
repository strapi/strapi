'use strict';

const createSection = require('./section');

const createSectionBuilder = () => {
  const state = {
    sections: new Map(),
  };

  return {
    createSection(sectionName, options) {
      const section = createSection(options);

      state.sections.set(sectionName, section);

      return this;
    },

    deleteSection(sectionName) {
      state.sections.remove(sectionName);

      return this;
    },

    addHandler(sectionName, handler) {
      if (state.sections.has(sectionName)) {
        state.sections.get(sectionName).hooks.handlers.register(handler);
      }

      return this;
    },

    addMatcher(sectionName, matcher) {
      if (state.sections.has(sectionName)) {
        state.sections.get(sectionName).hooks.matchers.register(matcher);
      }

      return this;
    },

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
