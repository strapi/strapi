'use strict';

const { isFunction, eq } = require('lodash/fp');
const {
  subjectsHandlerFor,
  contentTypesBase,
  fieldsProperty,
  plugins: pluginsHandler,
  settings: settingsHandler,
} = require('./handlers');

const createSectionPropMatcher = targetValue => action => action.section === targetValue;

const createSectionsTemplate = sections => {
  const sectionsEntries = Array.from(sections.entries());

  return sectionsEntries.reduce((acc, [sectionName, options]) => {
    const { withSubjects } = options;
    const section = { actions: [] };

    if (withSubjects) {
      Object.assign(section, { subjects: [] });
    }

    return { ...acc, [sectionName]: section };
  }, {});
};

class SectionsBuilder {
  constructor() {
    this._sections = new Map();
  }

  addSection(sectionName, options = {}) {
    const { withSubjects = false, handlers = [], matchers = [] } = options;

    this._sections.set(sectionName, { withSubjects, handlers, matchers });

    return this;
  }

  deleteSection(sectionName) {
    if (this._sections.has(sectionName)) {
      this._sections.delete(sectionName);
    }

    return this;
  }

  addHandler(sectionName, handler) {
    if (this._sections.has(sectionName) && isFunction(handler)) {
      this._sections.get(sectionName).handlers.push(handler);
    }

    return this;
  }

  addMatcher(sectionName, matcher) {
    if (this._sections.has(sectionName) && isFunction(matcher)) {
      this._sections.get(sectionName).matchers.push(matcher);
    }

    return this;
  }

  getValidSectionsForAction(action) {
    return Array.from(this._sections.entries())
      .filter(([, { matchers }]) => matchers.map(matcher => matcher(action)).some(eq(true)))
      .map(([section]) => section);
  }

  async build(actions = []) {
    const sections = createSectionsTemplate(this._sections);

    for (const action of actions) {
      const matchedSectionsForAction = this.getValidSectionsForAction(action);

      for (const sectionName of matchedSectionsForAction) {
        await this.processAction(sectionName, action, sections[sectionName]);
      }
    }

    return sections;
  }

  async processAction(sectionName, action, target) {
    if (!this._sections.has(sectionName)) {
      return null;
    }

    const { handlers } = this._sections.get(sectionName);

    for (const handler of handlers) {
      await handler(action, target);
    }
  }
}

const createSectionsBuilder = () => {
  const builder = new SectionsBuilder();

  builder.addSection('plugins', {
    handlers: [pluginsHandler],
    matchers: [createSectionPropMatcher('plugins')],
  });

  builder.addSection('settings', {
    handlers: [settingsHandler],
    matchers: [createSectionPropMatcher('plugins')],
  });

  builder.addSection('singleTypes', {
    withSubjects: true,
    handlers: [contentTypesBase, subjectsHandlerFor('singleType'), fieldsProperty],
    matchers: [createSectionPropMatcher('contentTypes')],
  });

  builder.addSection('collectionTypes', {
    withSubjects: true,
    handlers: [contentTypesBase, subjectsHandlerFor('collectionType'), fieldsProperty],
    matchers: [createSectionPropMatcher('contentTypes')],
  });

  return builder;
};

module.exports = createSectionsBuilder;
