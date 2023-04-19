'use strict';

const { map, values, sumBy, pipe, flatMap, propEq } = require('lodash/fp');

const getNumberOfDynamicZones = () => {
  return pipe(
    map('attributes'),
    flatMap(values),
    sumBy(propEq('type', 'dynamiczone'))
  )(strapi.contentTypes);
};

module.exports = getNumberOfDynamicZones;
