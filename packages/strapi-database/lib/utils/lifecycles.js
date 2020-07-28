'use strict';

const _ = require('lodash');

const executeLifecycle = async (lifecycle, model, ...args) => {
  if (_.has(model, `lifecycles.${lifecycle}`)) {
    await model.lifecycles[lifecycle](...args);
  }
};

const executeBeforeLifecycle = (lifecycle, model, ...args) =>
  executeLifecycle(`before${_.upperFirst(lifecycle)}`, model, ...args);

const executeAfterLifecycle = (lifecycle, model, ...args) =>
  executeLifecycle(`after${_.upperFirst(lifecycle)}`, model, ...args);

module.exports = {
  executeBeforeLifecycle,
  executeAfterLifecycle,
};
