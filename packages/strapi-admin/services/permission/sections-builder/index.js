'use strict';

const { isFunction, eq } = require('lodash/fp');
const {
  subjectsHandlerFor,
  contentTypesBase,
  fieldsProperty,
  plugins: pluginsHandler,
  settings: settingsHandler,
} = require('./handlers');

const sectionPropMatcher = targetValue => action => action.section === targetValue;

const createContentTypesSchema = () => ({
  actions: [],
  subjects: [],
});

const createSectionsTemplate = sections => {
  const sectionsEntries = Array.from(sections.entries());

  return sectionsEntries.reduce(
    (acc, [sectionName, options]) => ({ ...acc, [sectionName]: options.schema }),
    {}
  );
};

class SectionsBuilder {
  constructor() {
    this._sections = new Map();
  }

  addSection(sectionName, options = {}) {
    const { schema = {}, handlers = [], matchers = [] } = options;

    this._sections.set(sectionName, { schema, handlers, matchers });

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
    schema: [],
    handlers: [pluginsHandler],
    matchers: [sectionPropMatcher('plugins')],
  });

  builder.addSection('settings', {
    schema: [],
    handlers: [settingsHandler],
    matchers: [sectionPropMatcher('settings')],
  });

  builder.addSection('singleTypes', {
    schema: createContentTypesSchema(),
    handlers: [contentTypesBase, subjectsHandlerFor('singleType'), fieldsProperty],
    matchers: [sectionPropMatcher('contentTypes')],
  });

  builder.addSection('collectionTypes', {
    schema: createContentTypesSchema(),
    handlers: [contentTypesBase, subjectsHandlerFor('collectionType'), fieldsProperty],
    matchers: [sectionPropMatcher('contentTypes')],
  });

  return builder;
};

module.exports = createSectionsBuilder;
