'use strict';

const _ = require('lodash');

module.exports = {
  replaceIdByPrimaryKey: (params, model) => {
    const newParams = { ...params };
    if (_.has(params, 'id')) {
      delete newParams.id;
      newParams[model.primaryKey] = params[model.primaryKey] || params.id;
    }
    return newParams;
  },
};
