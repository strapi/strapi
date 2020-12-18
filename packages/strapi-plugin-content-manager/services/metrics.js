'use strict';

const { intersection, prop } = require('lodash/fp');
const { getRelationalFields } = require('strapi-utils').relations;

const sendDidConfigureListView = async (contentType, configuration) => {
  const displayedFields = prop('length', configuration.layouts.list);
  const relationalFields = getRelationalFields(contentType);
  const displayedRF = intersection(relationalFields, configuration.layouts.list).length;

  const data = {
    containsRF: !!displayedRF,
  };

  if (data.containsRF) {
    Object.assign(data, {
      displayedFields,
      displayedRF,
    });
  }

  return strapi.telemetry.send('didConfigureListView', data);
};

module.exports = {
  sendDidConfigureListView,
};
