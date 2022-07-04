'use strict';

const { intersection, prop } = require('lodash/fp');
const { getRelationalFields } = require('@strapi/utils').relations;
const ampli = require('@strapi/telemetry/server');

module.exports = ({ strapi }) => {
  const sendDidConfigureListView = async (contentType, configuration) => {
    const displayedFields = prop('length', configuration.layouts.list);
    const relationalFields = getRelationalFields(contentType);
    const displayedRelationalFields = intersection(relationalFields, configuration.layouts.list)
      .length;

    const data = {
      containsRelationalFields: !!displayedRelationalFields,
    };

    if (data.containsRelationalFields) {
      Object.assign(data, {
        displayedFields,
        displayedRelationalFields,
      });
    }

    try {
      await ampli.didConfigureListView(
        '',
        data,
        {},
        { source: 'core', send: strapi.telemetry.send }
      );
    } catch (e) {
      // silence
    }
  };

  return {
    sendDidConfigureListView,
  };
};
