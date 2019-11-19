'use strict';

const createSchemaHandler = require('./schema-handler');
const createComponentBuilder = require('./component-builder');
const createContentTypeBuilder = require('./content-type-builder');

module.exports = function createSchemaBuilder({ components, contentTypes }) {
  const tmpComponents = new Map();
  const tmpContentTypes = new Map();

  // init temporary ContentTypes
  Object.keys(contentTypes).forEach(key => {
    tmpContentTypes.set(
      contentTypes[key].uid,
      createSchemaHandler(contentTypes[key])
    );
  });

  // init temporary components
  Object.keys(components).forEach(key => {
    tmpComponents.set(
      components[key].uid,
      createSchemaHandler(components[key])
    );
  });

  const ctx = {
    get components() {
      return tmpComponents;
    },
    get contentTypes() {
      return tmpContentTypes;
    },

    ...createComponentBuilder({ tmpComponents, tmpContentTypes }),
    ...createContentTypeBuilder({ tmpComponents, tmpContentTypes }),

    flush() {
      return Promise.all(
        [
          ...Array.from(tmpComponents.values()),
          ...Array.from(tmpContentTypes.values()),
        ].map(schema => schema.flush())
      );
    },
    rollback() {
      return Promise.all(
        [
          ...Array.from(tmpComponents.values()),
          ...Array.from(tmpContentTypes.values()),
        ].map(schema => schema.rollback())
      );
    },
  };

  return ctx;
};
