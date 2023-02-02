'use strict';

const { isArray } = require('lodash/fp');

const traverseEntity = require('../traverse-entity');
const { getNonWritableAttributes } = require('../content-types');
const { pipeAsync } = require('../async');

const visitors = require('./visitors');
const sanitizers = require('./sanitizers');

module.exports = {
  contentAPI: {
    input(data, schema, { auth } = {}) {
      if (isArray(data)) {
        return Promise.all(data.map((entry) => this.input(entry, schema, { auth })));
      }

      const nonWritableAttributes = getNonWritableAttributes(schema);

      const transforms = [
        // Remove non writable attributes
        traverseEntity(visitors.restrictedFields(nonWritableAttributes), { schema }),
      ];

      if (auth) {
        // Remove restricted relations
        transforms.push(traverseEntity(visitors.removeRestrictedRelations(auth), { schema }));
      }

      // Apply sanitizers from registry if exists
      strapi.sanitizers
        .get('content-api.input')
        .forEach((sanitizer) => transforms.push(sanitizer(schema)));

      return pipeAsync(...transforms)(data);
    },

    output(data, schema, { auth } = {}) {
      if (isArray(data)) {
        return Promise.all(data.map((entry) => this.output(entry, schema, { auth })));
      }

      const transforms = [sanitizers.defaultSanitizeOutput(schema)];

      if (auth) {
        transforms.push(traverseEntity(visitors.removeRestrictedRelations(auth), { schema }));
      }

      // Apply sanitizers from registry if exists
      strapi.sanitizers
        .get('content-api.output')
        .forEach((sanitizer) => transforms.push(sanitizer(schema)));

      return pipeAsync(...transforms)(data);
    },
  },

  sanitizers,
  visitors,
};
