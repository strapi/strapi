'use strict';

const _ = require('lodash');

const executeHook = async (hook, model, ...args) => {
  if (_.has(model, hook)) {
    await model[hook](...args);
  }
};

const executeBeforeHook = (hook, model, ...args) =>
  executeHook(`before${_.upperFirst(hook)}`, model, ...args);

const executeAfterHook = (hook, model, ...args) =>
  executeHook(`after${_.upperFirst(hook)}`, model, ...args);

module.exports = {
  executeBeforeHook,
  executeAfterHook,
};
