'use strict';

const _ = require('lodash');

const executeLifecycleHook = async (lifecycle, model, ...args) => {
  if (_.has(model, `lifecycles.${lifecycle}`)) {
    await model.lifecycles[lifecycle](...args);
  }
};

const executeBeforeLifecycleHook = (lifecycle, model, ...args) =>
  executeLifecycleHook(`before${_.upperFirst(lifecycle)}`, model, ...args);

const executeAfterLifecycleHook = (lifecycle, model, ...args) =>
  executeLifecycleHook(`after${_.upperFirst(lifecycle)}`, model, ...args);

module.exports = {
  executeBeforeLifecycleHook,
  executeAfterLifecycleHook,
};
